#!/usr/bin/env python3
"""
hvj_bill_parser.py

Parse LippoLand TMD / HVJ monthly billing PDFs into structured data.

Key feature:
- If the PDF is encrypted, the script will automatically try to decrypt it using
  the default password: 11934657
- If the PDF is not encrypted, the script proceeds normally (no decryption attempt).

Dependencies:
- pypdf (pip install pypdf)

Examples:
  python hvj_bill_parser.py statement.pdf --out bill.json
  python hvj_bill_parser.py statement.pdf --format tidy-csv --out bill.csv

If you need to override the default password:
  python hvj_bill_parser.py statement.pdf --password "OTHERPASS" --out bill.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from pypdf import PdfReader
except Exception as e:
    raise SystemExit(
        "Missing dependency. Install with: pip install pypdf\n"
        f"Import error: {e}"
    )

DEFAULT_PDF_PASSWORD = "11934657"

MONTH_ID = {
    "januari": 1, "februari": 2, "maret": 3, "april": 4, "mei": 5, "juni": 6,
    "juli": 7, "agustus": 8, "september": 9, "oktober": 10, "november": 11, "desember": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

def normalize_space(s: str) -> str:
    return re.sub(r"[ \t]+", " ", re.sub(r"\s+", " ", s or "")).strip()

def parse_idr_amount(s: str) -> Optional[int]:
    """
    Parse Indonesian-format currency amounts to int IDR.
    Accepts:
      "5.184.268" -> 5184268
      "Rp 5.184.268" -> 5184268
      "1.444,70" -> 1444 (best-effort integer)
    """
    if not s:
        return None
    s = s.strip()
    s = s.replace("Rp", "").replace("rp", "").strip()

    if "." in s and "," in s:
        s2 = s.replace(".", "").replace(",", ".")
        try:
            return int(float(s2))
        except ValueError:
            return None

    if "." in s and "," not in s:
        s2 = s.replace(".", "")
        try:
            return int(s2)
        except ValueError:
            return None

    if "," in s and "." not in s:
        if s.count(",") >= 2:
            s2 = s.replace(",", "")
            try:
                return int(s2)
            except ValueError:
                return None
        s2 = s.replace(",", ".")
        try:
            return int(float(s2))
        except ValueError:
            return None

    s2 = re.sub(r"[^\d]", "", s)
    return int(s2) if s2.isdigit() else None

def parse_float_id(s: str) -> Optional[float]:
    """
    Parse Indonesian decimal with thousands separators:
      "1.444,70" -> 1444.70
      "22.500" -> 22500.0
      "8,80" -> 8.8
    """
    if not s:
        return None
    s = s.strip()
    s = s.replace("Rp", "").replace("rp", "").strip()

    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        if "," in s and "." not in s:
            s = s.replace(",", ".")
        if "." in s and s.count(".") == 1:
            left, right = s.split(".")
            if len(right) == 3 and left.isdigit() and right.isdigit():
                s = left + right
    try:
        return float(s)
    except ValueError:
        return None

def find_first(pattern: str, text: str, flags: int = re.IGNORECASE) -> Optional[re.Match]:
    return re.search(pattern, text, flags)

def extract_pdf_text(path: Path, password: Optional[str]) -> str:
    """
    If PDF is encrypted: attempt decrypt using provided password (or DEFAULT_PDF_PASSWORD).
    If not encrypted: do not attempt decryption.
    """
    reader = PdfReader(str(path))

    if getattr(reader, "is_encrypted", False):
        pw = password if password is not None else DEFAULT_PDF_PASSWORD
        ok = reader.decrypt(pw)
        # pypdf can return 0/1/2 or True/False depending on version
        if not ok:
            raise SystemExit(
                f"PDF is encrypted and could not be decrypted with password '{pw}'. "
                f"Provide the correct password via --password."
            )

    parts: List[str] = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts)

def parse_statement_month(text: str) -> Optional[Tuple[int, int]]:
    m = find_first(
        r"Tagihan\s+s\.d\s+Bulan.*?(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not m:
        m = find_first(
            r"Invoice\s+up\s+to.*?(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
    if not m:
        return None 
    month_name = m.group(1).lower()
    year = int(m.group(2))
    month = MONTH_ID.get(month_name)
    return (year, month) if month else None

def prev_month(year: int, month: int) -> Tuple[int, int]:
    if month == 1:
        return (year - 1, 12)
    return (year, month - 1)

def _parse_date_loose(s: str) -> Optional[str]:
    s = s.strip()
    parts = s.split()
    if len(parts) != 3:
        return None
    day = int(re.sub(r"\D", "", parts[0]) or "0")
    mon = MONTH_ID.get(parts[1].lower())
    year = int(re.sub(r"\D", "", parts[2]) or "0")
    if not (day and mon and year):
        return None
    try:
        return datetime(year, mon, day).date().isoformat()
    except ValueError:
        return None

def _find_line_amount(text: str, pattern: str) -> Optional[int]:
    m = find_first(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    return parse_idr_amount(m.group(1))

def _find_float(text: str, pattern: str) -> Optional[float]:
    m = find_first(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    return parse_float_id(m.group(1))

def _find_amount_near(text: str, label_pattern: str, window: int = 100, prefer_last: bool = False) -> Optional[int]:
    matches = list(re.finditer(label_pattern, text, flags=re.IGNORECASE))
    if not matches:
        return None
    m = matches[-1] if prefer_last else matches[0]
    seg = text[m.end(): m.end() + window]
    n = find_first(r"([0-9]{1,3}(?:[\.\,][0-9]{3})+(?:[\.\,][0-9]{1,2})?|[0-9]+)", seg)
    return parse_idr_amount(n.group(1)) if n else None

@dataclass
class BillExtract:
    source_file: str
    customer_name: Optional[str] = None
    customer_id: Optional[str] = None
    client_code: Optional[str] = None
    invoice_number: Optional[str] = None
    print_date: Optional[str] = None
    due_date: Optional[str] = None
    statement_year: Optional[int] = None
    statement_month: Optional[int] = None
    utility_year: Optional[int] = None
    utility_month: Optional[int] = None
    amount_to_pay_idr: Optional[int] = None

    sinking_fund_idr: Optional[int] = None
    service_charge_idr: Optional[int] = None
    vat_service_charge_idr: Optional[int] = None
    electric_total_idr: Optional[int] = None
    water_total_idr: Optional[int] = None
    fitout_idr: Optional[int] = None

    electric_kwh: Optional[float] = None
    electric_tariff_per_kwh: Optional[float] = None
    electric_usage_cost_idr: Optional[int] = None
    electric_vat_idr: Optional[int] = None
    electric_pju_idr: Optional[int] = None
    electric_shared_area_idr: Optional[int] = None
    electric_meter_start_kwh: Optional[float] = None
    electric_meter_end_kwh: Optional[float] = None
    electric_kva: Optional[float] = None

    water_m3: Optional[float] = None
    water_tariff_per_m3: Optional[float] = None
    water_potable_idr: Optional[int] = None
    water_non_potable_idr: Optional[int] = None
    water_wastewater_idr: Optional[int] = None
    water_vat_wastewater_idr: Optional[int] = None
    water_maintenance_idr: Optional[int] = None
    water_shared_area_idr: Optional[int] = None
    water_meter_start_m3: Optional[float] = None
    water_meter_end_m3: Optional[float] = None

def parse_hvj_bill(text: str, source_file: str) -> BillExtract:
    t = text
    out = BillExtract(source_file=source_file)

    m = find_first(r"([A-Za-z][A-Za-z\s]+)\s*-\s*\(Customer ID:\s*([0-9]+)\)", t)
    if m:
        out.customer_name = normalize_space(m.group(1))
        out.customer_id = m.group(2)

    m = find_first(r"Kode\s+Pelanggan.*?\n?(\d{6,})", t, flags=re.IGNORECASE | re.DOTALL)
    if m:
        out.client_code = m.group(1)

    m = find_first(r"Nomor\s+Tagihan\s*:\s*([A-Z0-9/]+)", t, flags=re.IGNORECASE | re.DOTALL)
    if m:
        out.invoice_number = m.group(1)

    m = find_first(r"Tanggal\s+Cetak\s*:\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", t, flags=re.IGNORECASE | re.DOTALL)
    if m:
        out.print_date = _parse_date_loose(m.group(1))

    m = find_first(r"Jatuh\s+Tempo.*?\n?([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})", t, flags=re.IGNORECASE | re.DOTALL)
    if m:
        out.due_date = _parse_date_loose(m.group(1))

    sm = parse_statement_month(t)
    if sm:
        out.statement_year, out.statement_month = sm
        uy, um = prev_month(out.statement_year, out.statement_month)
        out.utility_year, out.utility_month = uy, um

    m = find_first(r"Jumlah\s+yang\s+Harus\s+Dibayar.*?\n?([0-9\.\,]+)", t, flags=re.IGNORECASE | re.DOTALL)
    if m:
        out.amount_to_pay_idr = parse_idr_amount(m.group(1))

    out.electric_total_idr = _find_line_amount(t, r"Electric\s*\(.*?\)\s*([0-9\.\,]+)")
    out.water_total_idr = _find_line_amount(t, r"Tagihan\s+Air\s*\(.*?\)\s*([0-9\.\,]+)")
    out.service_charge_idr = _find_line_amount(t, r"Service\s+Charge\s*\(.*?\)\s*([0-9\.\,]+)")
    out.vat_service_charge_idr = _find_line_amount(t, r"PPN\s+Service\s+Charge\s*([0-9\.\,]+)")
    out.sinking_fund_idr = _find_line_amount(t, r"Sinking\s+Fund\s*([0-9\.\,]+)")
    out.fitout_idr = _find_line_amount(t, r"Fitout\s*([0-9\.\,]+)")
    if out.fitout_idr is None:
        out.fitout_idr = 0

    # Electric detail
    out.electric_meter_end_kwh = _find_float(t, r"Pencatatan\s+Meter\s+Listrik.*?Akhir\s*:\s*([0-9\.\,]+)")
    out.electric_meter_start_kwh = _find_float(t, r"Pencatatan\s+Meter\s+Listrik.*?Awal\s*:\s*([0-9\.\,]+)")
    out.electric_kwh = _find_float(t, r"Rincian\s+Tagihan\s+Listrik.*?Pemakaian\s*:\s*([0-9\.\,]+)")
    out.electric_tariff_per_kwh = _find_float(t, r"Rincian\s+Tagihan\s+Listrik.*?Tarif\s*:\s*([0-9\.\,]+)")
    out.electric_kva = _find_float(t, r"Daya\s*:\s*([0-9\.\,]+)\s*KVA")

    out.electric_usage_cost_idr = _find_amount_near(t, r"Biaya\s+Pemakaian\s+Listrik", window=120)
    out.electric_vat_idr = _find_amount_near(t, r"PPN\s+Listrik", window=80)
    out.electric_pju_idr = _find_amount_near(t, r"PJU", window=80)
    # Prefer_last so we don't accidentally grab the water section's "Area Bersama"
    out.electric_shared_area_idr = _find_amount_near(t, r"Rincian\s+Tagihan\s+Listrik.*?Area\s+Bersama", window=120, prefer_last=False)
    if out.electric_total_idr is None:
        out.electric_total_idr = _find_amount_near(t, r"Jumlah\s+Tagihan\s+Listrik", window=120)

    # Water detail
    out.water_meter_end_m3 = _find_float(t, r"Pencatatan\s+Meter\s+Air.*?Akhir\s*:\s*([0-9\.\,]+)")
    out.water_meter_start_m3 = _find_float(t, r"Pencatatan\s+Meter\s+Air.*?Awal\s*:\s*([0-9\.\,]+)")
    out.water_m3 = _find_float(t, r"Pencatatan\s+Meter\s+Air.*?Pemakaian\s*:\s*([0-9\.\,]+)")
    out.water_tariff_per_m3 = _find_float(t, r"Pemakaian\s+Air\s+Bersih.*?Tarif\s*:\s*([0-9\.\,]+)")

    out.water_potable_idr = _find_amount_near(t, r"Biaya\s+Pemakaian\s+Air\s+Bersih\s+Potable", window=140)
    out.water_non_potable_idr = _find_amount_near(t, r"Biaya\s+Pemakaian\s+Air\s+Bersih\s+Non\s+Potable", window=140)
    out.water_wastewater_idr = _find_amount_near(t, r"Biaya\s+Pengelolaan\s+Air\s+Limbah", window=140)
    out.water_vat_wastewater_idr = _find_amount_near(t, r"PPN\s+Air\s+Limbah", window=140)
    out.water_maintenance_idr = _find_amount_near(t, r"Biaya\s+Pemeliharaan\s+Meter\s+Air", window=140)
    out.water_shared_area_idr = _find_amount_near(t, r"Rincian\s+Tagihan\s+Air.*?Area\s+Bersama", window=200, prefer_last=False)
    if out.water_total_idr is None:
        out.water_total_idr = _find_amount_near(t, r"Jumlah\s+Tagihan\s+Air", window=120)

    return out

def ym(y: Optional[int], m: Optional[int]) -> Optional[str]:
    if not y or not m:
        return None
    return f"{y:04d}-{m:02d}"

def to_tidy_rows(b: BillExtract) -> List[Dict[str, Any]]:
    statement_ym = ym(b.statement_year, b.statement_month)
    utility_ym = ym(b.utility_year, b.utility_month)

    rows: List[Dict[str, Any]] = []

    def add(category: str, amount: Optional[int], period: Optional[str], meta: Dict[str, Any] | None = None):
        if amount is None or period is None:
            return
        r: Dict[str, Any] = {
            "period": period,
            "category": category,
            "amount_idr": amount,
            "invoice_number": b.invoice_number,
            "client_code": b.client_code,
            "due_date": b.due_date,
            "print_date": b.print_date,
            "source_file": b.source_file,
        }
        if meta:
            r.update(meta)
        rows.append(r)

    add("Service Charge", b.service_charge_idr, statement_ym)
    add("PPn (Svc Chg)", b.vat_service_charge_idr, statement_ym)
    add("Sinking Fund", b.sinking_fund_idr, statement_ym)
    add("Fitout", b.fitout_idr, statement_ym)

    add("Electric (M-1)", b.electric_total_idr, statement_ym, meta={
        "utility_period": utility_ym,
        "kwh": b.electric_kwh,
        "tariff_per_kwh": b.electric_tariff_per_kwh,
        "meter_start_kwh": b.electric_meter_start_kwh,
        "meter_end_kwh": b.electric_meter_end_kwh,
    })
    add("Water (M-1)", b.water_total_idr, statement_ym, meta={
        "utility_period": utility_ym,
        "m3": b.water_m3,
        "tariff_per_m3": b.water_tariff_per_m3,
        "meter_start_m3": b.water_meter_start_m3,
        "meter_end_m3": b.water_meter_end_m3,
    })

    add("TOTAL", b.amount_to_pay_idr, statement_ym)
    return rows

def to_wide_month_map(b: BillExtract) -> Dict[str, Dict[str, Any]]:
    return {
        "Sinking Fund": {"amount_idr": b.sinking_fund_idr},
        "Service Charge": {"amount_idr": b.service_charge_idr},
        "PPn (Svc Chg)": {"amount_idr": b.vat_service_charge_idr},
        "Electric (M-1)": {"amount_idr": b.electric_total_idr},
        "Water (M-1)": {"amount_idr": b.water_total_idr},
        "Fitout": {"amount_idr": b.fitout_idr},
        "TOTAL": {"amount_idr": b.amount_to_pay_idr},
        "Electric (M-1)/kwh": {"value": b.electric_kwh},
        "Electric (M-1)/tarif_kwh": {"value": b.electric_tariff_per_kwh},
        "Water (M-1)/m3": {"value": b.water_m3},
        "Water (M-1)/tarif_m3": {"value": b.water_tariff_per_m3},
    }

def write_text(out: str, content: str) -> None:
    if out == "-":
        print(content, end="")
    else:
        p = Path(out)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

class _StdoutWriter:
    def write(self, s: str) -> int:
        print(s, end="")
        return len(s)

def main():
    ap = argparse.ArgumentParser(description="Parse HVJ/LippoLand TMD billing PDFs.")
    ap.add_argument("pdf", type=str, help="Path to PDF file")
    ap.add_argument(
        "--password",
        type=str,
        default=None,
        help=f"PDF password if encrypted. If omitted and PDF is encrypted, defaults to {DEFAULT_PDF_PASSWORD}.",
    )
    ap.add_argument("--format", choices=["json", "tidy-csv", "wide-json"], default="json",
                    help="Output format")
    ap.add_argument("--out", type=str, default="-",
                    help="Output path, or '-' for stdout (default)")
    args = ap.parse_args()

    pdf_path = Path(args.pdf)
    text = extract_pdf_text(pdf_path, password=args.password)
    bill = parse_hvj_bill(text, source_file=str(pdf_path))

    if args.format == "json":
        write_text(args.out, json.dumps(asdict(bill), ensure_ascii=False, indent=2) + "\n")

    elif args.format == "wide-json":
        payload = {
            "statement_period": ym(bill.statement_year, bill.statement_month),
            "utility_period": ym(bill.utility_year, bill.utility_month),
            "month_values": to_wide_month_map(bill),
            "meta": {
                "invoice_number": bill.invoice_number,
                "client_code": bill.client_code,
                "due_date": bill.due_date,
                "print_date": bill.print_date,
                "source_file": bill.source_file,
            }
        }
        write_text(args.out, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")

    elif args.format == "tidy-csv":
        rows = to_tidy_rows(bill)
        if args.out == "-":
            w = csv.DictWriter(_StdoutWriter(), fieldnames=sorted({k for r in rows for k in r.keys()}))
            w.writeheader()
            for r in rows:
                w.writerow(r)
        else:
            outp = Path(args.out)
            outp.parent.mkdir(parents=True, exist_ok=True)
            with outp.open("w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=sorted({k for r in rows for k in r.keys()}))
                w.writeheader()
                for r in rows:
                    w.writerow(r)

if __name__ == "__main__":
    main()

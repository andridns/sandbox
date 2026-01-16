"""
Excel file import service
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
import re
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
from openpyxl.cell import Cell
import io


class ExcelImportService:
    """Service to parse and extract expense data from Excel files"""
    
    # Common column name mappings (case-insensitive)
    COLUMN_MAPPINGS = {
        'date': ['date', 'tanggal', 'transaction date', 'expense date', 'timestamp'],
        'amount': ['amount', 'jumlah', 'total', 'price', 'harga', 'value'],
        'description': ['description', 'deskripsi', 'note', 'notes', 'detail', 'item', 'merchant', 'store', 'name', 'rawtext', 'raw text'],
        'category': ['category', 'kategori', 'type', 'jenis'],
        'payment_method': ['payment method', 'payment', 'method', 'cara bayar', 'metode pembayaran'],
        'location': ['location', 'lokasi', 'place', 'tempat'],
        'notes': ['notes', 'note', 'catatan', 'remarks', 'keterangan', 'who', 'rawtext', 'raw text'],
        'currency': ['currency', 'mata uang', 'matauang'],
        'tags': ['tags', 'tag', 'label'],
    }
    
    def __init__(self, file_content: bytes):
        """
        Initialize with Excel file content
        
        Args:
            file_content: Binary content of Excel file
        """
        self.file_content = file_content
        self.workbook = None
        self.worksheet = None
        self.column_map: Dict[str, int] = {}
        self.errors: List[str] = []
    
    def parse(self) -> Tuple[List[Dict], List[str]]:
        """
        Parse Excel file and extract expense data
        
        Returns:
            Tuple of (expenses list, errors list)
        """
        try:
            # Load workbook from bytes
            self.workbook = load_workbook(io.BytesIO(self.file_content), data_only=True)
            
            # Use first sheet
            self.worksheet = self.workbook.active
            
            # Detect header row and map columns
            self._detect_columns()
            
            if not self.column_map:
                return [], ["Could not detect required columns. Please ensure your Excel file has columns for Date, Amount, and Description."]
            
            # Extract expenses
            expenses = []
            row_num = 2  # Start from row 2 (assuming row 1 is header)
            
            while row_num <= self.worksheet.max_row:
                row_data = self._extract_row(row_num)
                
                if row_data:
                    # Validate row data
                    validation_error = self._validate_row(row_data, row_num)
                    if validation_error:
                        self.errors.append(f"Row {row_num}: {validation_error}")
                    else:
                        expenses.append(row_data)
                
                row_num += 1
            
            return expenses, self.errors
            
        except Exception as e:
            return [], [f"Error parsing Excel file: {str(e)}"]
    
    def _detect_columns(self):
        """Detect column headers and create mapping"""
        if not self.worksheet:
            return
        
        # Check first few rows for headers
        for row_num in range(1, min(4, self.worksheet.max_row + 1)):
            row = self.worksheet[row_num]
            
            for col_idx, cell in enumerate(row, start=1):
                if not cell.value:
                    continue
                
                cell_value = str(cell.value).strip().lower()
                
                # Check against column mappings
                for field, aliases in self.COLUMN_MAPPINGS.items():
                    if cell_value in aliases and field not in self.column_map:
                        self.column_map[field] = col_idx
                        break
            
            # If we found required columns, stop searching
            if 'date' in self.column_map and 'amount' in self.column_map and 'description' in self.column_map:
                break
    
    def _extract_row(self, row_num: int) -> Optional[Dict]:
        """Extract data from a single row"""
        row = self.worksheet[row_num]
        row_data = {}
        
        # Extract each mapped field
        for field, col_idx in self.column_map.items():
            if col_idx <= len(row):
                cell = row[col_idx - 1]
                value = cell.value
                
                if value is not None:
                    row_data[field] = value
        
        # Handle description field - prefer 'name' over 'rawtext' if both exist
        if 'name' in row_data and 'rawtext' in row_data:
            # Use Name as primary description, RawText as notes if available
            if not row_data.get('description'):
                row_data['description'] = row_data.get('name') or row_data.get('rawtext')
            if not row_data.get('notes'):
                rawtext = row_data.get('rawtext', '').strip()
                name = row_data.get('name', '').strip()
                if rawtext and rawtext != name:
                    row_data['notes'] = rawtext
        elif 'name' in row_data and not row_data.get('description'):
            row_data['description'] = row_data['name']
        elif 'rawtext' in row_data and not row_data.get('description'):
            row_data['description'] = row_data['rawtext']
        
        # Handle 'who' field - add to notes if available
        if 'who' in row_data and row_data['who']:
            who_value = str(row_data['who']).strip()
            if who_value:
                existing_notes = row_data.get('notes', '')
                if existing_notes:
                    row_data['notes'] = f"{existing_notes} (by {who_value})"
                else:
                    row_data['notes'] = f"by {who_value}"
        
        # Return None if row is empty
        if not row_data:
            return None
        
        return row_data
    
    def _validate_row(self, row_data: Dict, row_num: int) -> Optional[str]:
        """Validate a row of expense data"""
        errors = []
        
        # Check required fields
        if 'date' not in row_data or not row_data['date']:
            errors.append("Date is required")
        else:
            # Parse date
            parsed_date = self._parse_date(row_data['date'])
            if not parsed_date:
                errors.append(f"Invalid date format: {row_data['date']}")
            else:
                row_data['date'] = parsed_date
        
        if 'amount' not in row_data or row_data['amount'] is None:
            errors.append("Amount is required")
        else:
            # Parse amount
            parsed_amount = self._parse_amount(row_data['amount'])
            if not parsed_amount:
                errors.append(f"Invalid amount: {row_data['amount']}")
            else:
                row_data['amount'] = parsed_amount
        
        if 'description' not in row_data or not row_data['description']:
            errors.append("Description is required")
        else:
            # Normalize description
            row_data['description'] = str(row_data['description']).strip()
            if len(row_data['description']) > 500:
                errors.append("Description too long (max 500 characters)")
        
        # Parse optional fields
        if 'payment_method' in row_data and row_data['payment_method']:
            row_data['payment_method'] = str(row_data['payment_method']).strip()
        else:
            row_data['payment_method'] = 'Cash'  # Default
        
        if 'currency' in row_data and row_data['currency']:
            currency = str(row_data['currency']).strip().upper()
            if len(currency) == 3:
                row_data['currency'] = currency
            else:
                row_data['currency'] = 'IDR'  # Default
        else:
            row_data['currency'] = 'IDR'  # Default
        
        if 'location' in row_data and row_data['location']:
            location = str(row_data['location']).strip()
            if len(location) > 200:
                location = location[:200]
            row_data['location'] = location
        else:
            row_data['location'] = None
        
        if 'notes' in row_data and row_data['notes']:
            row_data['notes'] = str(row_data['notes']).strip()
        else:
            row_data['notes'] = None
        
        if 'tags' in row_data and row_data['tags']:
            # Parse tags (comma-separated or space-separated)
            tags_str = str(row_data['tags']).strip()
            if ',' in tags_str:
                tags = [t.strip() for t in tags_str.split(',')]
            else:
                tags = tags_str.split()
            row_data['tags'] = [t for t in tags if t]
        else:
            row_data['tags'] = []
        
        if errors:
            return "; ".join(errors)
        
        return None
    
    def _parse_date(self, value) -> Optional[date]:
        """Parse date from various formats"""
        if isinstance(value, date):
            return value
        if isinstance(value, datetime):
            return value.date()
        
        if not value:
            return None
        
        value_str = str(value).strip()
        
        # Try parsing datetime with time component first (e.g., "1/1/2026 20:55:47")
        datetime_formats = [
            '%m/%d/%Y %H:%M:%S',
            '%d/%m/%Y %H:%M:%S',
            '%Y-%m-%d %H:%M:%S',
            '%m/%d/%Y %H:%M',
            '%d/%m/%Y %H:%M',
            '%Y-%m-%d %H:%M',
        ]
        
        for fmt in datetime_formats:
            try:
                return datetime.strptime(value_str, fmt).date()
            except ValueError:
                continue
        
        # Try common date formats (without time)
        date_formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%m/%d/%Y',
            '%d-%m-%Y',
            '%Y/%m/%d',
            '%d.%m.%Y',
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(value_str, fmt).date()
            except ValueError:
                continue
        
        # Try parsing as Excel date serial number
        try:
            serial = float(value_str)
            # Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
            from datetime import timedelta
            excel_epoch = datetime(1899, 12, 30)
            return (excel_epoch + timedelta(days=int(serial))).date()
        except (ValueError, OverflowError):
            pass
        
        return None
    
    def _parse_amount(self, value) -> Optional[float]:
        """Parse amount from various formats"""
        if isinstance(value, (int, float)):
            return float(value)
        
        if not value:
            return None
        
        value_str = str(value).strip()
        
        # Remove currency symbols and spaces
        value_str = re.sub(r'[Rp$€£¥,\s]', '', value_str)
        
        # Replace period with nothing if it's a thousands separator (e.g., 1.000.000)
        # Check if there are multiple periods
        if value_str.count('.') > 1:
            value_str = value_str.replace('.', '')
        # If single period, check if it's likely a decimal separator
        elif '.' in value_str:
            parts = value_str.split('.')
            # If part after period has more than 2 digits, it's likely thousands separator
            if len(parts) > 1 and len(parts[1]) > 2:
                value_str = value_str.replace('.', '')
        
        try:
            return float(value_str)
        except ValueError:
            return None

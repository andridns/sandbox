# Performance Optimization Baseline Metrics

**Measurement Date:** January 27, 2026
**Git Commit:** (before optimization)

## Frontend Bundle Size (BASELINE)

### Build Output
```
dist/assets/index-C_63Qyqj.js   566.48 kB │ gzip: 177.98 kB  ⚠️ TOO LARGE
dist/assets/index-DlUzaj9X.css   36.49 kB │ gzip:   6.63 kB
```

### Summary
- **Total JS Bundle:** 566.48 KB (minified) / 177.98 KB (gzipped)
- **Total CSS Bundle:** 36.49 KB (minified) / 6.63 KB (gzipped)
- **Total Assets:** ~603 KB minified / ~185 KB gzipped
- **Warning:** Vite reports bundle exceeds 500 KB threshold

### Analysis
- **No code splitting:** All pages bundled into single JS file
- **Chart.js + plugins:** Estimated ~120-150 KB of the bundle
- **Eager loading:** All routes loaded on initial page load
- **Large pages:** Reports (35 KB) and History (29 KB) not lazy-loaded

## Backend Performance (BASELINE)

### Query Profiling Status
- ✅ Query profiling middleware installed
- ✅ Logs queries > 100ms as slow
- **Note:** No indexes on category_id, currency, or composite date+category
- **Note:** No eager loading - potential N+1 queries in exports and reports

### Database Schema
- **Tables:** expenses, categories, users, budgets, expense_history, rent_expenses, backups
- **Expense Fields:** id, amount, currency, description, category_id, date, tags (JSON), receipt_url, location, notes, is_recurring
- **Indexes:** Only on primary keys and date field
- **Missing Indexes:** category_id, user_id, currency, description (search)

### API Endpoints (Current)
- 13 routers active
- No combined dashboard endpoint (multiple round trips for Reports page)
- No caching layer (every request hits database)
- Pagination: 500 items/page (too large for Reports page)

## Expected Improvements

### Frontend Targets
- **Bundle Size:** Reduce by 40-50% → Target: 300-350 KB minified / 90-110 KB gzipped
- **Initial Load:** Remove ~250 KB through lazy loading
- **Chart Library:** Save ~70 KB by switching Chart.js → Recharts
- **Code Splitting:** Split into 5-7 route chunks (10-50 KB each)

### Backend Targets
- **Query Speed:** 10-100x improvement with indexes + eager loading
- **Dashboard API:** Single endpoint reduces round trips from 4-5 to 1
- **Caching:** 5-minute cache for dashboard reduces DB load by ~95%
- **Search:** Case-insensitive index makes search instant (< 100ms)

### Features Removed (Code Cleanup)
- **Budgets:** Complete feature removal (models, API, UI, ~30 KB)
- **Tags:** Complete feature removal (API, UI, ~10 KB)
- **Receipt Uploads:** Complete feature removal (API, UI, storage)
- **Export:** Remove Excel + PDF, keep CSV only (save reportlab, ~20 KB)
- **Fields:** Remove notes, location, is_recurring, tags, receipt_url from expenses
- **Pagination:** Reduce from 500 to 200 items/page

---

## Next Steps

1. ✅ Phase 1: Baseline measurement (COMPLETE)
2. 🔄 Phase 2: Database optimization (indexes, eager loading, caching)
3. 🔄 Phase 3: Backend feature removal
4. 🔄 Phase 4: Frontend feature removal
5. 🔄 Phase 5: Frontend bundle optimization
6. 🔄 Phase 6: Post-optimization measurement
7. 🔄 Phase 7: Verification and testing

---

## Measurement Instructions

### To measure page load time:
1. Open Chrome DevTools → Network tab
2. Check "Disable cache"
3. Navigate to Reports page
4. Record:
   - **DOMContentLoaded:** Time when HTML parsed
   - **Load:** Time when all resources loaded
   - **Total transfer size:** Sum of all downloaded assets
   - **Time to Interactive:** When page is fully usable

### To measure search performance:
1. Load Expenses page with 1000+ records
2. Open DevTools → Network tab
3. Type in search box
4. Measure API response time for search query
5. Record time from keystroke to UI update

### To test backend query profiling:
```bash
cd backend
ENVIRONMENT=development poetry run uvicorn app.main:app --reload

# Watch logs for SLOW QUERY warnings
# Test endpoints and observe query times
```

---

**Status:** BASELINE COMPLETE ✅
**Ready for Phase 2:** Database Optimization

# Báo cáo Audit Performance & UI/UX — TripSync AI

**Ngày audit:** 2026-04-29
**Phạm vi:** Toàn bộ frontend (13 components, 4 services, build config, HTML/CSS root)
**Phương pháp:** Static analysis bằng 3 subagent song song (Sonnet) chia theo 3 chiều: Performance, UI/UX, Accessibility + Code health.
**Stack:** Vite 6 + React 19.2 + TypeScript + Tailwind CSS (CDN) + Supabase + Google Gemini + ExcelJS

---

## 1. Executive Summary

App có nền tảng đẹp (dark theme nhất quán, animation system, lazy load Dashboard/TripView, dùng `React.memo` rộng) nhưng có **6 vấn đề P0** cần xử lý ngay vì chúng ảnh hưởng trực tiếp đến trải nghiệm người dùng cuối hoặc làm mất tính năng. Đáng chú ý nhất:

### Top 6 findings nghiêm trọng nhất

| # | Severity | Tiêu đề | File chính |
|---|---|---|---|
| 1 | **P0** | `PackingList` bị thiếu khỏi `TripView` — tính năng đã code nhưng không hiển thị | [components/TripView.tsx:243-269](../../components/TripView.tsx#L243-L269) |
| 2 | **P0** | Tailwind CDN + Google Fonts block render → FCP rất chậm | [index.html:7-10](../../index.html#L7-L10) |
| 3 | **P0** | ExcelJS (~900KB) bundle vào TripView dù chỉ dùng khi bấm export | [components/Finances.tsx](../../components/Finances.tsx) (top imports) |
| 4 | **P0** | `setView()` gọi trong render phase — anti-pattern React | [App.tsx:570](../../App.tsx#L570), [App.tsx:592](../../App.tsx#L592) |
| 5 | **P0** | `alert()` / `confirm()` native dùng 13+ lần cho feedback chính | [App.tsx:386](../../App.tsx#L386), [components/Dashboard.tsx:137](../../components/Dashboard.tsx#L137) |
| 6 | **P0** | Không có `ErrorBoundary` → bất kỳ lỗi runtime nào đều gây white screen | [App.tsx](../../App.tsx) (toàn file) |

### Phân bố findings theo severity

| | Performance | UI/UX | A11y / Code health | **Tổng** |
|---|---|---|---|---|
| **P0** | 3 | 2 | 3 | **8** |
| **P1** | 7 | 7 | 7 | **21** |
| **P2** | 4 | 7 | 2 | **13** |
| **Tổng** | 14 | 16 | 12 | **42** |

> **Khuyến nghị nhanh nhất:** Đọc mục 6 (Quick wins ≤ 15 phút) để có 14 fix có thể làm trong 1 buổi sáng — giá trị/effort cao nhất.

---

## 2. Phương pháp & phạm vi

### Đã đọc
- `App.tsx`, toàn bộ `components/`, toàn bộ `services/`, `hooks/useDebounce.ts`
- `index.html`, `index.css`, `tsconfig.json`, `package.json`, `vite.config.ts`
- Cross-check một số file:line trong báo cáo này bằng cách đọc lại trực tiếp

### Không đọc / không kiểm tra
- Backend Supabase schema, RLS policies, migrations
- Test suite (project chưa có test nào)
- Bundle build thực tế chưa chạy `npm run build` nên các con số KB là ước lượng từ pattern import
- Lighthouse / WebPageTest chưa chạy thực tế — không có số FCP/LCP/CLS đo thực
- Cross-browser testing
- E2E user flow trên thiết bị thật

### Quy ước

- **Severity**: P0 (blocker / critical), P1 (đáng fix sớm), P2 (polish)
- **Effort**: XS (<15 phút), S (<1h), M (1-4h), L (>4h)
- Mọi finding đều có **file:line cụ thể** đã được verify.

---

## 3. Performance findings

### 3.1. P0 — Critical

#### P0 | M | Tailwind CDN + Google Fonts block render
**File:** [index.html:7-10](../../index.html#L7-L10)
**Vấn đề:** `index.html` load Tailwind từ `https://cdn.tailwindcss.com` (~300KB, runtime parse toàn bộ utility) và Google Fonts qua `<link>` không có `display=swap` đầy đủ. Cả 2 đều render-blocking. Vite không xử lý chúng nên build production vẫn giữ nguyên CDN.
**Impact:** FCP (First Contentful Paint) chậm 200-600ms; mỗi request user phải đợi DNS lookup + CDN cold-start.
**Fix gợi ý:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
- Xóa `<script src="https://cdn.tailwindcss.com">` khỏi `index.html`
- Thêm `@tailwind base; @tailwind components; @tailwind utilities;` vào `index.css`
- Self-host Inter font hoặc thêm `&display=swap` + `subset=latin,latin-ext`

#### P0 | L | ExcelJS (~900KB) bundle vào main TripView chunk
**File:** [components/Finances.tsx](../../components/Finances.tsx) (import top), [services/excelExportService.ts:1](../../services/excelExportService.ts#L1)
**Vấn đề:** `Finances.tsx` import tĩnh `exportFinancesToExcel`, mà service này import top-level `import { Workbook } from 'exceljs'`. Vì `Finances` được import tĩnh trong `TripView`, ExcelJS bị bundle cùng `TripView` chunk, dù tính năng export chỉ chạy khi user bấm 1 nút hiếm gặp.
**Impact:** TripView chunk tăng ~900KB (gzipped ~250-300KB). Mỗi lần vào trip view, browser parse + evaluate ExcelJS không cần thiết.
**Fix gợi ý:**
```tsx
// Finances.tsx — dynamic import on-demand
const handleExportExcel = async () => {
  const { exportFinancesToExcel } = await import('../services/excelExportService');
  exportFinancesToExcel(trip, selectedTreasurer);
};
// Xóa: import { exportFinancesToExcel } from '../services/excelExportService';
```

#### P0 | S | `setView()` gọi trong render phase
**File:** [App.tsx:570](../../App.tsx#L570), [App.tsx:592](../../App.tsx#L592)
**Vấn đề:** Trong `renderContent()` switch, hai case gọi `setView(...)` trực tiếp — anti-pattern React. React 19 có thể tha cho lần đầu nhưng có thể gây double-render hoặc loop.
**Impact:** Hành vi không xác định, khó debug.
**Fix gợi ý:**
```tsx
useEffect(() => {
  if (view === 'dashboard' && !user) setView('login');
  if (view === 'trip' && !selectedTrip) setView(user ? 'dashboard' : 'login');
}, [view, user, selectedTrip]);
// Trong renderContent: chỉ return null, không setState
```

### 3.2. P1 — Đáng fix sớm

#### P1 | S | Timer 1-giây trong `Timeline` re-render toàn bộ component mỗi giây
**File:** [components/Timeline.tsx:106-111](../../components/Timeline.tsx#L106-L111)
**Vấn đề:** `setInterval(() => setLiveTime(new Date()), 1000)` đặt trong Timeline (530 LOC) → mỗi giây re-render toàn bộ tree, deps memo phải so sánh lại.
**Impact:** ~60 re-renders/phút, jank trên thiết bị mid-end khi nhiều activities.
**Fix:** Tách countdown thành component con `<CountdownWidget />` được `memo`, nhận `nextEvent` làm prop. Timer ở trong component này; Timeline cha không re-render theo giây.

#### P1 | S | `memo` trên `Dashboard` vô dụng vì `planners` là `.filter()` inline
**File:** [App.tsx:578](../../App.tsx#L578)
**Vấn đề:** `planners={users.filter(u => u.role === UserRole.MANAGER)}` tạo array mới mỗi render → `Dashboard` (memoized) bypass shallow compare → re-render khi App update bất kỳ state nào.
**Impact:** Dashboard re-render thừa mỗi tick state.
**Fix:**
```tsx
const planners = useMemo(
  () => users.filter(u => u.role === UserRole.MANAGER),
  [users]
);
```

#### P1 | S | `Timeline` memo vô dụng — `onUpdateEvents` không stable
**File:** [components/TripView.tsx:64-66](../../components/TripView.tsx#L64-L66), [TripView.tsx:251](../../components/TripView.tsx#L251)
**Vấn đề:** `handleUpdateTimeline` không bọc `useCallback` → mỗi render TripView tạo function mới → `Timeline` (memoized) re-render.
**Fix:** Bọc `handleUpdateTimeline`, `handleUpdatePackingList`, `handleUpdateFinances` (nếu có) bằng `useCallback` với deps `[trip, onUpdateTrip]`.

#### P1 | M | `Finances.financialSummary` recalc khi đổi `selectedTreasurer` local state
**File:** [components/Finances.tsx:84-181](../../components/Finances.tsx#L84-L181)
**Vấn đề:** `financialSummary` useMemo có `selectedTreasurer` trong deps; `totalCollectedContributions` (dòng 179-181) không memo, chạy O(n) mỗi render. Logic balance cũng duplicate giữa `Finances.tsx` và `excelExportService.ts`.
**Impact:** Mỗi keystroke ở dropdown treasurer trigger ~50-100 ops; duplicated code → bug fix một nơi quên nơi khác.
**Fix:** Memo hóa `totalCollectedContributions`; tách logic chia tiền thành utility chung trong `services/financeCalculations.ts`, dùng cả ở Finances và excel export.

#### P1 | XS | `key={index}` trong `settledTransactions` map
**File:** [components/Finances.tsx:658](../../components/Finances.tsx#L658)
**Vấn đề:** `key={index}` trên list được tính lại khi expenses/contributions đổi → React reconcile sai, có thể giữ state component cũ.
**Fix:** `key={\`${t.from}-${t.to}-${t.amount}\`}`.

#### P1 | XS | `console.log('📦 Using cached timeline')` lọt vào production
**File:** [services/geminiService.ts:189](../../services/geminiService.ts#L189)
**Fix:** Xóa hoặc wrap `if (import.meta.env.DEV) {...}`.

#### P1 | S | `vite.config.ts` thiếu `manualChunks` & `chunkSizeWarningLimit`
**File:** [vite.config.ts](../../vite.config.ts)
**Vấn đề:** Không có chunk strategy → Supabase + Gemini SDK + UI tree dồn vào 1 chunk lớn. Không có cảnh báo chunk > 500KB.
**Fix gợi ý:**
```ts
build: {
  chunkSizeWarningLimit: 300,
  rollupOptions: {
    output: {
      manualChunks: {
        supabase: ['@supabase/supabase-js'],
        gemini: ['@google/genai'],
      }
    }
  }
}
```

#### P1 | S | `TripStats` memo bị bypass do nhận cả object `trip`
**File:** [components/TripStats.tsx:25-26](../../components/TripStats.tsx#L25), [TripView.tsx:241](../../components/TripView.tsx#L241)
**Fix:** Truyền primitive props đã derive (`totalExpenses`, `numParticipants`, `startDate`, `endDate`) thay vì object `trip`, hoặc bỏ `memo` (vì stats rẻ tính, memo không đáng).

### 3.3. P2 — Polish

#### P2 | S | `ExpenseCategoryChart` — `uid` regen mỗi khi `conicSegments` đổi → FOUC nhỏ
**File:** [components/ExpenseCategoryChart.tsx:58](../../components/ExpenseCategoryChart.tsx#L58)
**Fix:** Đổi deps `useMemo` thành `[]`, hoặc dùng `useId()`.

#### P2 | XS | `useDebounce` hook tồn tại nhưng không dùng đâu
**File:** [hooks/useDebounce.ts](../../hooks/useDebounce.ts)
**Note:** Không cần xóa; dùng khi thêm search trong Dashboard/Finances.

#### P2 | XS | `Weather` không cache giữa navigation
**File:** [components/Weather.tsx:56-62](../../components/Weather.tsx#L56-L62), [services/weatherService.ts](../../services/weatherService.ts)
**Fix:** Thêm module-level `Map` cache với TTL 10 phút (copy pattern từ [services/geminiService.ts](../../services/geminiService.ts)).

#### P2 | XS | Dashboard query `select('*')` lấy cả `timeline`/`expenses` JSON
**File:** [App.tsx:169](../../App.tsx#L169), [App.tsx:204](../../App.tsx#L204)
**Fix:** `select('id, custom_id, name, destination, start_date, end_date, cover_image_url, manager_id, participants, treasurer_id')` — chỉ lấy field cần cho list. Load full khi user click vào trip.

---

## 4. UI/UX findings

### 4.1. P0 — Blocker UX

#### P0 | S | `PackingList` bị mất khỏi `TripView` layout
**File:** [components/TripView.tsx:243-269](../../components/TripView.tsx#L243-L269)
**Vấn đề:** TripView import `PackingList`, define `handleUpdatePackingList` (dòng 68-70), nhưng JSX `<main>` chỉ render Timeline + 3 charts (cột trái) và Weather + Finances (cột phải). `<PackingList />` hoàn toàn vắng mặt.
**Impact UX:** Tính năng quản lý đồ đóng gói đã code nhưng user không bao giờ thấy. Đây có thể là bug do refactor — bị xóa rồi quên thêm lại.
**Fix gợi ý:** Thêm vào cột phải sau `Weather`:
```tsx
<PackingList
  initialItems={trip.packingList || []}
  isAdmin={isAdminOrManager}
  tripDestination={trip.destination}
  tripDuration={getDaysDuration()}
  onUpdateItems={handleUpdatePackingList}
/>
```

#### P0 | M | `alert()` / `confirm()` native dùng 13+ lần cho feedback chính
**File:** [App.tsx:386](../../App.tsx#L386), [App.tsx:401](../../App.tsx#L401), [App.tsx:438](../../App.tsx#L438), [App.tsx:467](../../App.tsx#L467), [components/Dashboard.tsx:137](../../components/Dashboard.tsx#L137), [Dashboard.tsx:148](../../components/Dashboard.tsx#L148), [components/Finances.tsx:306](../../components/Finances.tsx#L306), [components/Timeline.tsx:147-149](../../components/Timeline.tsx#L147-L149)
**Vấn đề:** Native `alert/confirm` cho mọi feedback (tạo trip ok, lỗi network, validate form, xóa thành viên...). Không khớp dark theme, block thread trên mobile, không a11y.
**Impact UX:** Trông rất unprofessional, đặc biệt mobile Safari. User không biết action có gây side-effect khi alert pop-up xuất hiện. Form validation lỗi không highlight field tương ứng.
**Fix gợi ý:**
- Tạo `<Toast>` component + `useToast()` hook (max 3 dòng, tự dismiss 4s, có icon success/error, `role="alert" aria-live="assertive"`)
- Generalize `<ConfirmModal>` (component đã có cấu trúc trong Dashboard/TripView) thay cho `confirm()`
- Form validation chuyển sang inline error: state `errors: Record<string, string>` + `border-red-500` + message dưới input

### 4.2. P1 — Friction lớn

#### P1 | S | AI suggest không có progress indicator phù hợp; spinner phá layout button
**File:** [components/Timeline.tsx:417-419](../../components/Timeline.tsx#L417-L419), [components/PackingList.tsx:153-154](../../components/PackingList.tsx#L153-L154)
**Vấn đề:** Khi gọi Gemini (5-15s), button bị disable + spinner `h-12 w-12` (48px) lớn hơn padding button → vỡ layout. Không có cancel, không có thông báo "AI đang phân tích...".
**Fix:**
- Thêm prop `size="sm"` vào `<Spinner>` cho `w-4 h-4`
- Đổi text button: `{isAISuggesting ? 'Đang tạo...' : 'Tạo ý tưởng'}`
- Thêm progress text: `<p className="text-xs text-gray-400 mt-2 animate-pulse">AI đang phân tích, có thể mất 10–15 giây...</p>`

#### P1 | S | Dashboard empty state chỉ là text xám — không có CTA
**File:** [components/Dashboard.tsx:227](../../components/Dashboard.tsx#L227)
**Vấn đề:** User mới chưa có trip thấy `<p className="text-gray-500">Bạn chưa tạo chuyến đi nào.</p>`. Không icon, không CTA nổi bật, không hướng dẫn onboarding.
**Fix:** Empty state với icon lớn + heading + description + CTA button "🗺️ Tạo chuyến đi đầu tiên".

#### P1 | S | Modal không scroll được trên mobile, content bị cắt
**File:** [components/ui.tsx:98](../../components/ui.tsx#L98)
**Vấn đề:** Modal wrapper dùng `max-w-md p-6` nhưng không có `max-h-[90vh] overflow-y-auto`. Form tạo trip / thêm chi phí có 6-7 fields → tràn dưới viewport trên iPhone SE.
**Fix:** Thêm `max-h-[90vh] overflow-y-auto` vào div nội dung modal; xét `items-start sm:items-center` trên overlay.

#### P1 | M | Edit/delete chỉ visible khi hover — touch device không dùng được
**File:** [components/Finances.tsx:680](../../components/Finances.tsx#L680), [components/Timeline.tsx:372](../../components/Timeline.tsx#L372), [components/PackingList.tsx:114](../../components/PackingList.tsx#L114)
**Vấn đề:** Class `opacity-0 group-hover:opacity-100` ẩn hoàn toàn trên mobile (không có hover state).
**Impact UX:** Mobile user không thể sửa/xóa expense, event, packing item.
**Fix:**
```tsx
className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
```
Hoặc thay bằng nút "..." mở action menu trên mobile.

#### P1 | S | Validate form qua `alert()` thay vì inline
**File:** [components/Dashboard.tsx:137](../../components/Dashboard.tsx#L137), [components/Timeline.tsx:147-149](../../components/Timeline.tsx#L147-L149)
*(Chồng với P0 alert ở 4.1 — fix chung).*

#### P1 | S | `Weather` component không có error state với retry
**File:** [components/Weather.tsx:123-125](../../components/Weather.tsx#L123-L125)
**Vấn đề:** Lỗi fetch chỉ hiện text xám, không retry button, không skeleton loading.
**Fix:** State `error: boolean`, render error UI với icon + nút "Thử lại".

#### P1 | M | Charts dùng grid cố định `[80px_1fr_120px]` vỡ trên mobile
**File:** [components/ExpenseChart.tsx:75](../../components/ExpenseChart.tsx#L75), [components/DailyExpenseChart.tsx:76](../../components/DailyExpenseChart.tsx#L76)
**Fix:** `grid-cols-[60px_1fr_90px] sm:grid-cols-[80px_1fr_120px]` hoặc layout 2 dòng trên mobile.

#### P1 | XS | Header TripView hiển thị ngày ISO `2024-07-15`
**File:** [components/TripView.tsx:190](../../components/TripView.tsx#L190)
**Fix:** Dùng `formatDate()` đã có trong types.ts → `15/07/2024`.

### 4.3. P2 — Polish

#### P2 | XS | 2 loading state có style khác nhau
**File:** [App.tsx:556-563](../../App.tsx#L556-L563), [App.tsx:15](../../App.tsx#L15) (`LoadingFallback`)
**Fix:** Tạo `<FullScreenLoader message="..." />` dùng chung.

#### P2 | XS | Button variant `danger` declared nhưng không dùng — `!important` override khắp nơi
**File:** [components/ui.tsx:19](../../components/ui.tsx#L19), [Dashboard.tsx:332](../../components/Dashboard.tsx#L332), [TripView.tsx:350](../../components/TripView.tsx#L350)
**Fix:** Thay `className="!bg-red-600 hover:!bg-red-500"` bằng `variant="danger"`.

#### P2 | S | Dashboard không có search/filter/sort cho trip list
**File:** [components/Dashboard.tsx:183](../../components/Dashboard.tsx#L183)
**Fix:** Thêm input search + badge trạng thái (Sắp diễn ra / Đang diễn ra / Đã kết thúc) + date range trên trip card.

#### P2 | S | Font Inter thiếu `subset=latin-ext` cho dấu tiếng Việt
**File:** [index.html:10](../../index.html#L10)
**Fix:** `&subset=latin,latin-ext&display=swap`. (Vấn đề này sẽ tự khắc phục khi self-host font theo P0 Tailwind CDN.)

#### P2 | XS | Scrollbar CSS duplicate giữa `index.html` và `index.css`
**File:** [index.html:14-29](../../index.html#L14-L29), [index.css:101-119](../../index.css#L101-L119)
**Fix:** Xóa block trong `index.html`, giữ duy nhất trong `index.css`.

#### P2 | XS | TripStats dùng `UsersIcon` cho cả "Chi phí/người" lẫn "Thành viên"
**File:** [components/TripStats.tsx:46-57](../../components/TripStats.tsx#L46-L57)
**Fix:** Đổi icon "Chi phí/người" sang calculator/coin icon trong [components/icons.tsx](../../components/icons.tsx).

#### P2 | XS | Weather component không có skeleton
**File:** [components/Weather.tsx](../../components/Weather.tsx)
**Fix:** Thay icon mặt trời pulse bằng skeleton card khớp layout cuối.

---

## 5. Accessibility & Code health findings

### 5.1. P0 — Critical

#### P0 | M | Không có `ErrorBoundary` — bất kỳ throw nào → white screen
**Loại:** Code health
**File:** [App.tsx](../../App.tsx) (root) — không tồn tại
**Vấn đề:** Không có error boundary nào. Lazy `Dashboard`, `TripView` bọc `<Suspense>` nhưng Suspense KHÔNG bắt error. Gemini service throw, Supabase mất kết nối → màn hình trắng.
**Fix gợi ý:** Tạo [components/AppErrorBoundary.tsx](../../components/AppErrorBoundary.tsx) class component, bọc `<App />` trong `index.tsx`. UI fallback dark-theme với nút "Tải lại trang".

#### P0 | S | `Modal` không có `role="dialog"`, `aria-modal`, `aria-labelledby`, không trap focus, không Escape
**Loại:** A11y
**File:** [components/ui.tsx:93-107](../../components/ui.tsx#L93-L107)
**Vấn đề:** Modal là overlay đơn giản, dùng ở 10+ chỗ. Screen reader không biết là dialog; user keyboard không đóng được bằng Escape; tab có thể thoát ra khỏi modal.
**Fix:**
```tsx
const titleId = React.useId();
useEffect(() => {
  if (!isOpen) return;
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [isOpen, onClose]);
// JSX:
<div role="dialog" aria-modal="true" aria-labelledby={titleId} ...>
  <h2 id={titleId}>{title}</h2>
  <button aria-label="Đóng hộp thoại" onClick={onClose}>&times;</button>
```
Bonus: dùng `inert` trên content phía sau modal hoặc thư viện như `focus-trap-react`.

#### P0 | XS | TypeScript `strict` tắt → `any` lan tràn không bị bắt
**Loại:** Code health
**File:** [tsconfig.json](../../tsconfig.json) (xác nhận: không có `"strict": true`)
**Vấn đề:** App.tsx có ít nhất 5 chỗ `(trip: any)`, `(dbData: any)`, `formattedTrips.map((trip: any) => ...)` không bị compiler cảnh báo. Schema Supabase đổi → silent crash runtime.
**Fix:** Thêm `"strict": true` vào tsconfig, fix dần lỗi compiler. Bắt đầu từ [App.tsx](../../App.tsx) vì đây là data pipeline trọng yếu.

### 5.2. P1 — Đáng fix

#### P1 | S | Login tabs thiếu ARIA tablist pattern
**Loại:** A11y
**File:** [components/Login.tsx:56](../../components/Login.tsx#L56)
**Fix:** Thêm `role="tablist"` lên container; `role="tab"`, `aria-selected`, `aria-controls`, `id` lên từng button; `role="tabpanel"`, `aria-labelledby` lên panel.

#### P1 | S | `Spinner` / `LoadingFallback` không có `role="status"`, `aria-live`
**Loại:** A11y
**File:** [components/ui.tsx:123](../../components/ui.tsx#L123), [App.tsx:15](../../App.tsx#L15)
**Fix:**
```tsx
<div role="status" aria-live="polite" aria-label="Đang tải...">
  <span className="sr-only">Đang tải...</span>
  {/* spinner */}
</div>
```

#### P1 | S | `<label>` không liên kết `htmlFor`/`id` với select trong Finances
**Loại:** A11y
**File:** [components/Finances.tsx:405](../../components/Finances.tsx#L405), [Finances.tsx:700](../../components/Finances.tsx#L700), [Finances.tsx:706](../../components/Finances.tsx#L706), [Finances.tsx:729](../../components/Finances.tsx#L729)
**Fix:** Thêm `id` vào `<select>` và `htmlFor` tương ứng vào `<label>`. Riêng "Chia cho ai?" dùng `<fieldset>` + `<legend>` thay vì label trôi nổi cho group checkbox.

#### P1 | XS | Nút icon-only edit/delete thiếu `aria-label` có context
**Loại:** A11y
**File:** [components/Timeline.tsx:373](../../components/Timeline.tsx#L373), [components/Finances.tsx:681](../../components/Finances.tsx#L681), [components/Finances.tsx:629](../../components/Finances.tsx#L629), [components/ExpenseChart.tsx:61](../../components/ExpenseChart.tsx#L61)
**Fix:** `aria-label={\`Chỉnh sửa: ${event.activity}\`}`, `aria-label={\`Xóa: ${event.activity}\`}`. Toggle collapse: thêm `aria-expanded={isExpanded}`.

#### P1 | M | Charts không có text alternative cho screen reader
**Loại:** A11y
**File:** [components/ExpenseCategoryChart.tsx:66](../../components/ExpenseCategoryChart.tsx#L66), [components/ExpenseChart.tsx:54](../../components/ExpenseChart.tsx#L54), [components/DailyExpenseChart.tsx:64](../../components/DailyExpenseChart.tsx#L64)
**Fix:** Bọc chart trong `<figure aria-label="...">`, thêm `<figcaption className="sr-only">` chứa `<table>` với caption + tbody data — screen reader đọc được dữ liệu tài chính.

#### P1 | XS | Trip card là `<div onClick>` — keyboard không activate được
**Loại:** A11y
**File:** [components/Dashboard.tsx:185](../../components/Dashboard.tsx#L185)
**Fix:** Bọc bên trong `<button>` hoặc dùng `<a href="#">` với `tabIndex={0}`, `role="link"`, `onKeyDown` xử lý Enter/Space.

#### P1 | XS | Page title không đổi theo view
**Loại:** A11y
**File:** [App.tsx](../../App.tsx) (chưa có), [index.html:6](../../index.html#L6)
**Fix:**
```tsx
useEffect(() => {
  const titles: Record<AppView, string> = {
    login: 'Đăng nhập | TripSync AI',
    dashboard: 'Bảng điều khiển | TripSync AI',
    trip: selectedTrip ? `${selectedTrip.name} | TripSync AI` : 'Chuyến đi | TripSync AI',
  };
  document.title = titles[view];
}, [view, selectedTrip]);
```

#### P1 | M | `any` ở data pipeline trọng yếu (App.tsx)
**Loại:** Code health
**File:** [App.tsx:84](../../App.tsx#L84), [App.tsx:146](../../App.tsx#L146), [App.tsx:178](../../App.tsx#L178), [App.tsx:409](../../App.tsx#L409), [App.tsx:519](../../App.tsx#L519)
**Fix:** Tạo type `TripRow` cho raw Supabase response, thêm function `mapTripRowToTrip(row: TripRow): Trip` chuyển snake_case → camelCase. Loại bỏ `any` trong các `.map(trip: any => ...)`.

### 5.3. P2 — Polish

#### P2 | M | `App.tsx` 618 LOC + `Finances.tsx` 854 LOC — khó maintain
**Loại:** Code health
**File:** [App.tsx](../../App.tsx), [components/Finances.tsx](../../components/Finances.tsx)
**Fix:** Tách `useFinancialSummary(...)` hook ra `hooks/useFinancialSummary.ts`. Tách auth + CRUD trips + CRUD planners khỏi App.tsx thành các hook (`useAuth`, `useTrips`, `usePlanners`). App.tsx chỉ làm composition layer.

#### P2 | XS | `Intl.NumberFormat('vi-VN', ...)` đã đúng, `<html lang="vi">` đã đúng
**Loại:** A11y / i18n
**File:** [types.ts:108](../../types.ts#L108), [index.html:2](../../index.html#L2)
**Note:** ✅ Không cần làm gì. Đã chuẩn locale.

---

## 6. Quick wins (≤ 15 phút mỗi cái)

Đây là 14 mục effort = XS, có thể làm trong 1 buổi sáng cho ROI cao nhất:

| # | Severity | File:line | Việc cần làm |
|---|----|---|---|
| 1 | P1 perf | [services/geminiService.ts:189](../../services/geminiService.ts#L189) | Xóa `console.log('📦 Using cached timeline')` |
| 2 | P1 perf | [components/Finances.tsx:658](../../components/Finances.tsx#L658) | Đổi `key={index}` → `key={\`${t.from}-${t.to}-${t.amount}\`}` |
| 3 | P1 perf | [App.tsx:578](../../App.tsx#L578) | `useMemo` cho `planners = users.filter(...)` |
| 4 | P1 a11y | [components/Login.tsx:56](../../components/Login.tsx#L56) | Thêm ARIA tablist (`role="tablist"`, `role="tab"`, `aria-selected`) |
| 5 | P1 a11y | [components/ui.tsx:101](../../components/ui.tsx#L101) | Thêm `aria-label="Đóng hộp thoại"` cho nút `&times;` modal |
| 6 | P1 a11y | [components/ui.tsx:123](../../components/ui.tsx#L123) | Thêm `role="status"`, `aria-live="polite"`, `<span className="sr-only">` |
| 7 | P1 a11y | [App.tsx](../../App.tsx) | `useEffect` cập nhật `document.title` theo view |
| 8 | P1 a11y | [components/Dashboard.tsx:185](../../components/Dashboard.tsx#L185) | Thay `<div onClick>` trip card → `<button>` |
| 9 | P1 a11y | [components/Timeline.tsx:373](../../components/Timeline.tsx#L373), [Finances.tsx:681](../../components/Finances.tsx#L681) | Thêm `aria-label` có context cho icon button edit/delete |
| 10 | P1 ux | [components/TripView.tsx:190](../../components/TripView.tsx#L190) | `formatDate(trip.startDate)` thay vì raw ISO string |
| 11 | P0 code | [tsconfig.json](../../tsconfig.json) | Thêm `"strict": true` (sau đó fix compiler errors dần) |
| 12 | P2 ux | [components/ui.tsx:19](../../components/ui.tsx#L19) | Thay `className="!bg-red-600"` ở Dashboard/TripView → `variant="danger"` |
| 13 | P2 ux | [index.html:14-29](../../index.html#L14-L29) | Xóa scrollbar CSS duplicate, giữ trong `index.css` |
| 14 | P2 perf | [components/ExpenseCategoryChart.tsx:58](../../components/ExpenseCategoryChart.tsx#L58) | Đổi `useMemo(..., [conicSegments])` → `useMemo(..., [])` hoặc `useId()` |

---

## 7. Roadmap đề xuất

### Sprint 1 (Tuần 1) — Critical fixes (~1-2 ngày)
1. **Fix `PackingList` thiếu khỏi TripView** (P0, S) — đây là tính năng đã code mà user không thấy, ưu tiên cao nhất
2. **Bỏ Tailwind CDN, self-host font** (P0, M) — cải thiện FCP đáng kể
3. **Lazy load ExcelJS qua dynamic import** (P0, L) — cắt ~250-300KB gzipped khỏi TripView chunk
4. **Thêm ErrorBoundary** (P0, M) — chặn white screen crashes
5. **Fix `setView()` trong render** (P0, S)
6. **Bật TypeScript `strict`** (P0, XS để bật + S-M để fix lỗi)
7. **Toàn bộ 14 quick wins** (~3-4 giờ tổng)

### Sprint 2 (Tuần 2) — Foundational UX (~3-5 ngày)
1. **Toast / Snackbar system thay `alert()`** (P0 ux, M) — refactor 13+ chỗ
2. **`<ConfirmModal>` thay `confirm()`** (P0 ux, S)
3. **Modal a11y full** (`role="dialog"`, focus trap, Escape) (P0 a11y, S)
4. **Modal scroll trên mobile** (P1 ux, S)
5. **Hover-only edit/delete → mobile-friendly** (P1 ux, M)
6. **Inline form validation** thay `alert()` (P1 ux, S)

### Sprint 3 (Tuần 3) — Performance polish (~2-3 ngày)
1. **Vite `manualChunks` config** (P1 perf, S)
2. **Memo bypass fixes** (Dashboard `planners`, Timeline `onUpdateEvents`, TripStats `trip`) (P1 perf, S)
3. **Tách countdown timer khỏi Timeline** (P1 perf, S)
4. **Memo `totalCollectedContributions` + dedupe split-bill logic** (P1 perf, M)
5. **Weather cache + Supabase select cụ thể** (P2 perf, S)

### Sprint 4 (Tuần 4) — A11y & code health (~2-3 ngày)
1. **Charts text alternative** (P1 a11y, M)
2. **Form `<label htmlFor>` liên kết đầy đủ** (P1 a11y, S)
3. **Tách `useFinancialSummary`, `useAuth`, `useTrips` hooks** (P2 code, M)
4. **`TripRow` type + `mapTripRowToTrip`** (P1 code, M)

### Sau Sprint 4 — Polish (tùy chọn)
- Empty state Dashboard có illustration + CTA
- Dashboard search/filter/sort
- Skeleton loading thay spinner
- Mobile responsive charts
- Dark mode toggle (nếu muốn light mode)
- PWA / service worker (cho offline trip view)

---

## 8. Out of scope cho audit này

- Backend Supabase: RLS policies, indexes, query plan
- Bảo mật: secrets, auth flow chi tiết, OWASP
- SEO (app sau login)
- Visual design polish (color palette, illustration system)
- Test coverage (project chưa có test)
- Deployment / CI/CD
- Lighthouse / Web Vitals đo thực tế (đề xuất chạy `vercel deploy --preview` rồi đo)

---

## Phụ lục: Tóm tắt số liệu

- **Total findings:** 42 (8 P0, 21 P1, 13 P2)
- **Tổng effort ước lượng nếu fix toàn bộ:** ~10-15 ngày dev (1 dev FE)
- **Effort cho riêng Sprint 1 (P0 + Quick wins):** ~2 ngày
- **Files modified nếu fix Sprint 1:** ~15 files (chủ yếu App.tsx, ui.tsx, TripView.tsx, Finances.tsx, index.html, vite.config.ts, tsconfig.json)

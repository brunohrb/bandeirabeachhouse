# CLAUDE.md — Bandeira Beach House

## Project Overview

**Bandeira Stay Manager** is a single-page application (SPA) for managing short-term rental beach properties ("imóveis por temporada"). It tracks reservations, revenues, commissions, expenses, and property ownership. The entire UI and application are written in **Portuguese (pt-BR)**.

## Architecture

This is a **single-file web application** — all HTML, CSS, and JavaScript live in `index.html` (~2,900 lines, ~102 KB). There is no build system, bundler, or package manager.

### Tech Stack

| Layer        | Technology                     |
|--------------|--------------------------------|
| Frontend     | Vanilla JS + jQuery 3.6.0     |
| UI Widgets   | Select2 4.1.0 (dropdowns)     |
| Charts       | Chart.js 3.9.1                |
| Spreadsheets | XLSX 0.18.5 (SheetJS)         |
| Backend/DB   | Supabase 2.x (PostgreSQL BaaS)|
| Storage      | Supabase (primary), localStorage (fallback) |

All dependencies are loaded via CDN — there is no `package.json` or `node_modules`.

### Database Tables (Supabase)

| Table                 | Purpose                    |
|-----------------------|----------------------------|
| `reservas`            | Booking/reservation records|
| `despesas`            | Expense records            |
| `proprietarios`       | Property owners            |
| `categorias_despesas` | Expense categories         |
| `unidades`            | Properties/units           |

### Application Modules (6 Pages)

1. **Financeiro** — Financial dashboard with revenue, commissions, expenses indicators
2. **Analítica** — Charts and analytics (revenue trends, reservation counts, profit/loss)
3. **Despesas** — Expense management (add/edit/delete, categorized)
4. **Reservas Futuras** — Future reservations and cleaning schedule (WhatsApp integration)
5. **Proprietários** — Property owner management
6. **Upload de Dados** — Excel import for reservation data, Smoobu integration

## File Structure

```
bandeirabeachhouse/
├── index.html    # Entire application (HTML + CSS + JS)
└── README.md     # Minimal project description
```

## Code Conventions

### Naming

- **Constants:** UPPER_SNAKE_CASE — `DB_RESERVAS`, `DB_DESPESAS`, `CACHE_RESERVAS`
- **Functions:** camelCase, Portuguese names — `carregarReservasSupabase()`, `renderAnalitica()`
- **Data keys:** camelCase — `idReserva`, `mesAno`, `comissaoPortais`
- **CSS variables:** kebab-case — `--primary-color`, `--primary-dark`

### JavaScript Patterns

- Async/await for all Supabase operations
- jQuery `.ready()` for initialization
- Array methods (`.map()`, `.filter()`, `.reduce()`) for data processing
- SPA navigation via `.page` div visibility toggling
- Modals use `.modal-overlay` with `.active` class toggle
- Global cache variable `CACHE_RESERVAS` for performance
- localStorage used as fallback when Supabase is unavailable

### Inline Comment Markers

The codebase uses Portuguese emoji markers for section identification:
- `🔄` Loading/refresh operations
- `💰` Financial data processing
- `📊` Analytics rendering
- `🌐` Supabase/cloud operations
- `❌` Error handling
- `✅` Success states
- `📦` Data processing
- `💾` Storage operations

### Data Models

**Reservation:**
```javascript
{
  idReserva: string,
  unidade: string,
  ano: number,
  mes: string,
  mesAno: string,    // format: "YYYY-MM"
  receita: number,
  comissao: number,
  comissaoPortais: number,
  comissaoShortStay: number
}
```

**Expense:**
```javascript
{
  id: string,
  unidade: string,
  descricao: string,
  categoria: string,
  data: string,      // format: "YYYY-MM-DD"
  valor: number
}
```

## Development Workflow

### Running Locally

Open `index.html` directly in a browser. No server, build step, or install required.

### Making Changes

1. Edit `index.html` directly — all code lives there
2. Reload the browser to test
3. Commit with a descriptive message

### Key Considerations When Editing

- **Single-file constraint:** All changes go into `index.html`. Do not split code into separate files without explicit instruction.
- **Language:** All user-facing strings, variable names, and function names are in **Portuguese**. Follow this convention.
- **No build tools:** Do not introduce build systems (webpack, Vite, etc.) unless explicitly requested.
- **CDN dependencies:** Libraries are loaded via CDN `<script>` / `<link>` tags. Do not add a package manager unless requested.
- **Supabase credentials:** The public anon key is embedded in the HTML. This is intentional for this project; do not move it to environment variables unless asked.
- **localStorage fallback:** The app must continue working if Supabase is unreachable. Preserve the localStorage fallback pattern in any data layer changes.

### Deployment

Static file hosting — the single `index.html` can be served from any static host (GitHub Pages, Netlify, etc.). No server-side rendering or API server needed beyond Supabase.

## Common Tasks

### Adding a New Supabase Table Interaction

1. Define a `DB_` constant for the table name
2. Create `carregar[Entity]Supabase()` async function for loading
3. Create `salvar[Entity]Supabase()` async function for saving
4. Add localStorage fallback in case of Supabase failure
5. Wire into the appropriate page rendering function

### Adding a New Page/Module

1. Add a new `<div class="page" id="page-[name]">` section in the HTML
2. Add a navigation link in the sidebar/menu
3. Create a `render[Name]()` function in JavaScript
4. Hook up navigation event handler to show/hide the page

### Adding a New Chart

1. Add a `<canvas>` element in the target page section
2. Create a render function using Chart.js 3.x API
3. Destroy any existing chart instance before re-rendering to avoid memory leaks
4. Call the render function from the page's main render pipeline

## Testing

There is no automated test suite. Testing is manual — changes are verified by opening the HTML file in a browser and exercising the affected functionality.

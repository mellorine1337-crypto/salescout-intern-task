import { useMemo, useState } from "react";
import productsData from "../data/products.json";
import type { Product, PriceResult, Reason } from "../src/types";

const initialProducts: Product[] = productsData;
const currency = (value: number) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} ₸`;
const labels: Record<Reason, string> = {
  UNDERCUT: "Лучшая цена", AT_MIN: "Минимальная цена",
  AT_MAX: "Максимальная цена", NO_COMPETITORS: "Нет конкурентов",
};

export default function App() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [jsonInput, setJsonInput] = useState(JSON.stringify(initialProducts, null, 2));
  const [editorOpen, setEditorOpen] = useState(false);

  const rows = useMemo(() => products.map((product, index) => ({ product, result: results[index] }))
    .filter(({ product, result }) =>
      `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "ALL" || result?.reason === filter)), [products, results, query, filter]);
  const changes = results.filter((item) => item.oldPrice !== item.newPrice).length;
  const reductions = results.filter((item) => item.newPrice < item.oldPrice).length;
  const difference = results.reduce((sum, item) => sum + item.newPrice - item.oldPrice, 0);

  async function reprice() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/reprice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(products) });
      if (!response.ok) throw new Error(`Ошибка API: ${response.status}. Проверьте данные и сервер.`);
      const data: PriceResult[] = await response.json();
      setResults(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось выполнить расчёт"); }
    finally { setBusy(false); }
  }

  function applyJson() {
    try {
      const parsed: unknown = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error("Ожидается массив товаров");
      setProducts(parsed as Product[]); setResults([]); setError(""); setEditorOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Некорректный JSON"); }
  }

  function exportCsv() {
    const header = ["SKU", "Название", "Старая цена", "Новая цена", "Причина"];
    const cells = products.map((product, i) => [product.sku, product.name, results[i]?.oldPrice ?? product.myPrice, results[i]?.newPrice ?? "", results[i]?.reason ?? ""]);
    const csv = [header, ...cells]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    link.download = "salescout-prices.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S</div><div><strong>SaleScout</strong><small>PRICE INTELLIGENCE</small></div></div>
      <div className="side-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <div className="nav-item active"><span>▦</span> Обзор цен</div>
      <div className="nav-item"><span>◈</span> Мои товары <em>{products.length}</em></div>
      <div className="sidebar-bottom"><span className="status-dot"/> Локальная демо-версия <small>Kaspi.kz · Pricing Engine</small></div>
    </aside>
    <main className="main">
      <header className="topbar"><span>Рабочее пространство <b>/ Мониторинг цен</b></span><span className="avatar">SS</span></header>
      <div className="content">
        <div className="eyebrow"><span className="status-dot"/> СИСТЕМА УПРАВЛЕНИЯ ЦЕНАМИ</div>
        <div className="heading"><div><h1>Мониторинг цен</h1><p>Автоматический анализ конкурентов и оптимизация стоимости товаров.</p></div><button className="primary" disabled={busy} onClick={reprice}>{busy ? "Рассчитываем..." : "↗ Пересчитать цены"}</button></div>
        <div className="stats">
          <div className="stat"><span>ТОВАРОВ В КАТАЛОГЕ</span><strong>{products.length}</strong><small>Активные позиции</small></div>
          <div className="stat"><span>ЦЕН ИЗМЕНЕНО</span><strong>{results.length ? changes : "—"}</strong><small>{results.length ? `${reductions} снижений цены` : "Ожидает расчёта"}</small></div>
          <div className="stat"><span>СУММАРНОЕ ИЗМЕНЕНИЕ</span><strong className={difference < 0 ? "negative" : ""}>{results.length ? currency(difference) : "—"}</strong><small>По одной единице каждого SKU</small></div>
          <div className="stat"><span>СТАТУС АЛГОРИТМА</span><strong className="ready">● Готов</strong><small>Учитывает наличие и лимиты</small></div>
        </div>
        {error && <div className="error">{error}</div>}
        <section className="panel"><div className="panel-head"><div><h2>Каталог товаров</h2><p>Сравнение текущих и рекомендуемых цен</p></div><div className="actions"><button onClick={() => { setEditorOpen(!editorOpen); setJsonInput(JSON.stringify(products, null, 2)); }}>✎ Редактировать данные</button><button onClick={exportCsv}>↓ Экспорт CSV</button></div></div>
          {editorOpen && <div className="editor"><label>Массив товаров в формате JSON</label><textarea spellCheck={false} value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} rows={10}/><button className="primary" onClick={applyJson}>Применить данные</button></div>}
          <div className="toolbar"><input aria-label="Поиск товаров" placeholder="⌕  Поиск по названию или SKU..." value={query} onChange={(e) => setQuery(e.target.value)}/><select aria-label="Фильтр по причине" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">Все статусы</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div className="table-scroll"><table><thead><tr><th>ТОВАР / SKU</th><th>КОНКУРЕНТЫ</th><th>ТЕКУЩАЯ ЦЕНА</th><th>НОВАЯ ЦЕНА</th><th>ИЗМЕНЕНИЕ</th><th>ПРИЧИНА</th></tr></thead><tbody>{rows.map(({ product, result }) => <tr key={product.sku}><td><div className="product-name">{product.name}</div><div className="sku">{product.sku}</div></td><td><span className="count">{product.competitors.filter((c) => c.inStock).length} активных</span></td><td>{currency(product.myPrice)}</td><td className="new-price">{result ? currency(result.newPrice) : "—"}</td><td>{result ? <span className={result.newPrice < result.oldPrice ? "negative" : result.newPrice > result.oldPrice ? "positive" : "muted"}>{result.newPrice > result.oldPrice ? "+" : ""}{currency(result.newPrice - result.oldPrice)}</span> : <span className="muted">—</span>}</td><td>{result ? <span className={`pill ${result.reason.toLowerCase()}`}>{labels[result.reason]}</span> : <span className="pill pending">Не рассчитано</span>}</td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty">Товары не найдены</div>}</div>
          <div className="panel-footer">Показано {rows.length} из {products.length} товаров <span>Цены в казахстанских тенге (₸)</span></div>
        </section>
        <div className="note"><strong>Как работает SaleScout?</strong><p>Алгоритм находит минимальную цену конкурента в наличии, вычитает шаг и ограничивает результат минимальной и максимальной ценой товара. Если конкурентов нет, устанавливается максимальная цена.</p></div>
        <footer>© 2026 SaleScout · Демонстрационный проект для стажировки</footer>
      </div>
    </main>
  </div>;
}

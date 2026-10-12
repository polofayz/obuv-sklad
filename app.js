const money = (n) => `${Number(n).toLocaleString("ru-RU")} сум`;

const state = {
  data: null,
  kind: "all",
  sizes: new Set(),
  query: "",
  cart: JSON.parse(localStorage.getItem("obuv-cart") || "[]"),
};

const $ = (sel) => document.querySelector(sel);
const app = $("#app");

function saveCart() {
  localStorage.setItem("obuv-cart", JSON.stringify(state.cart));
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  const badge = $("#cartCount");
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

function productById(id) {
  return state.data.products.find((p) => String(p.id) === String(id));
}

function sizeKey(s) {
  return String(s).replace(".", ",");
}

function allSizes() {
  const set = new Set();
  for (const p of state.data.products) {
    for (const s of p.sizes) set.add(sizeKey(s));
  }
  return [...set].sort((a, b) => {
    const na = parseFloat(a.replace(",", "."));
    const nb = parseFloat(b.replace(",", "."));
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b, "ru");
    return na - nb;
  });
}

function hasSize(p, size) {
  return p.sizes.some((s) => sizeKey(s) === size);
}

function filtered() {
  return state.data.products.filter((p) => {
    const kindOk = state.kind === "all" || p.kind === state.kind;
    const sizeOk = state.sizes.size === 0 || [...state.sizes].some((s) => hasSize(p, s));
    const q = state.query.trim().toLowerCase();
    const text = `${p.name} ${p.colors.map((c) => c.name).join(" ")} ${p.id}`.toLowerCase();
    return kindOk && sizeOk && (!q || text.includes(q));
  });
}

function renderCatalog() {
  const items = filtered();
  const { products, skus, colors } = state.data.stats;
  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Обувь на складе</h1>
        <p>${products} ${word(products, "модель", "модели", "моделей")} · ${skus} ${word(skus, "коробка", "коробки", "коробок")} · ${colors} ${colorWord(colors)}</p>
      </div>
      <p>${items.length} товаров</p>
    </div>
    ${items.length
      ? `<section class="grid">${items.map(cardHTML).join("")}</section>`
      : `<div class="grid-empty">Нет моделей с таким размером. Снимите фильтр или выберите другой.</div>`}
  `;
  app.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.open;
      const p = productById(id);
      const picked = [...state.sizes].find((s) => hasSize(p, s));
      if (picked) {
        const color = p.colors.find((c) => c.sizes.some((s) => sizeKey(s) === picked)) || p.colors[0];
        const size = color.sizes.find((s) => sizeKey(s) === picked) || color.sizes[0];
        location.hash = `#/product/${id}?color=${encodeURIComponent(color.name)}&size=${encodeURIComponent(size)}`;
      } else {
        location.hash = `#/product/${id}`;
      }
    });
  });
}

function renderSizeFilters() {
  const bar = $("#sizeFilters");
  bar.innerHTML = `
    <button class="chip ${state.sizes.size === 0 ? "is-on" : ""}" data-size="all" type="button">Все</button>
    ${allSizes().map((s) => `
      <button class="chip ${state.sizes.has(s) ? "is-on" : ""}" data-size="${s}" type="button">${s}</button>
    `).join("")}
  `;
  bar.querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.size;
      if (val === "all") state.sizes.clear();
      else if (state.sizes.has(val)) state.sizes.delete(val);
      else state.sizes.add(val);
      renderSizeFilters();
      if (!location.hash.startsWith("#/product")) renderCatalog();
      else location.hash = "#/";
    });
  });
}

function cardHTML(p) {
  const sizes = state.sizes.size
    ? p.sizes.filter((s) => state.sizes.has(sizeKey(s))).join(", ")
    : p.sizes.join(", ");
  const colorN = p.colors.length;
  return `
    <article class="card" data-open="${p.id}">
      <div class="card-img">
        <img src="${p.cover}" alt="${p.name}" />
        ${p.discount ? `<span class="disc">-${p.discount}%</span>` : ""}
      </div>
      <div class="card-body">
        <div class="price">${money(p.price)}${p.oldPrice && p.oldPrice > p.price ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</div>
        <div class="title">${p.name}</div>
        <div class="meta">${colorN} ${colorWord(colorN)} · размеры ${sizes}</div>
      </div>
    </article>
  `;
}

function word(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
function colorWord(n) {
  return word(n, "цвет", "цвета", "цветов");
}

function renderProduct(id) {
  const p = productById(id);
  if (!p) { location.hash = "#/"; return; }
  const colorName = new URLSearchParams(location.hash.split("?")[1] || "").get("color") || p.colors[0].name;
  let color = p.colors.find((c) => c.name === colorName) || p.colors[0];
  const size = new URLSearchParams(location.hash.split("?")[1] || "").get("size") || color.sizes[0];
  const photoI = Number(new URLSearchParams(location.hash.split("?")[1] || "").get("img") || 0);
  const photos = color.photos.length ? color.photos : [p.cover];
  const img = photos[Math.min(photoI, photos.length - 1)];
  const variant = color.variants.find((v) => v.size === size) || color.variants[0];

  app.innerHTML = `
    <div class="pdp">
      <div class="crumbs"><a href="#/">Главная</a> / Обувь / ${p.kind} / ${p.name}</div>
      <div class="gallery">
        <div class="thumbs">
          ${photos.map((src, i) => `
            <button type="button" class="${i === photoI ? "is-on" : ""}" data-img="${i}">
              <img src="${src}" alt="" />
            </button>`).join("")}
        </div>
        <div class="main-photo"><img src="${img}" alt="${p.name}" /></div>
      </div>
      <div class="buy">
        <h1>${p.name}</h1>
        <div class="shop">${p.shop} · ${p.brand} · ID ${p.id}</div>
        <div class="label">Цвет: <b>${color.name}</b></div>
        <div class="swatches">
          ${p.colors.map((c) => `
            <button type="button" class="swatch ${c.name === color.name ? "is-on" : ""}" data-color="${encodeURIComponent(c.name)}" title="${c.name}">
              <img src="${c.photos[0] || p.cover}" alt="${c.name}" />
            </button>`).join("")}
        </div>
        <div class="label">Размер: <b>${size}</b> <span style="color:var(--muted);font-weight:400">только то, что есть</span></div>
        <div class="sizes">
          ${color.sizes.map((s) => `
            <button type="button" class="size ${s === size ? "is-on" : ""}" data-size="${s}">${s}</button>
          `).join("")}
        </div>
        <div class="big-price">${money(p.price)}${p.oldPrice && p.oldPrice > p.price ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</div>
        <button class="add" type="button" id="addBtn">В корзину</button>
        <div class="sku-line">SKU ${variant.skuName} · штрихкод ${variant.barcode}</div>
      </div>
    </div>
  `;

  const setQuery = (next) => {
    const q = new URLSearchParams();
    q.set("color", next.color);
    q.set("size", next.size);
    if (next.img) q.set("img", String(next.img));
    location.hash = `#/product/${p.id}?${q.toString()}`;
  };

  app.querySelectorAll("[data-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = decodeURIComponent(btn.dataset.color);
      const next = p.colors.find((c) => c.name === name);
      setQuery({ color: name, size: next.sizes[0], img: 0 });
    });
  });
  app.querySelectorAll("[data-size]").forEach((btn) => {
    btn.addEventListener("click", () => setQuery({ color: color.name, size: btn.dataset.size, img: photoI }));
  });
  app.querySelectorAll("[data-img]").forEach((btn) => {
    btn.addEventListener("click", () => setQuery({ color: color.name, size, img: Number(btn.dataset.img) }));
  });
  $("#addBtn").addEventListener("click", () => {
    const key = `${p.id}-${color.name}-${size}`;
    const exist = state.cart.find((i) => i.key === key);
    if (exist) exist.qty += 1;
    else state.cart.push({
      key, id: p.id, name: p.name, color: color.name, size,
      skuName: variant.skuName, barcode: variant.barcode,
      price: p.price, photo: photos[0], qty: 1,
    });
    saveCart();
    openCart();
  });
}

function cartHTML() {
  if (!state.cart.length) return `<div class="empty">Пока пусто. Добавьте пару с витрины.</div>`;
  const sum = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  return `
    ${state.cart.map((i) => `
      <div class="cart-item">
        <img src="${i.photo}" alt="" />
        <div>
          <div>${i.name}</div>
          <div class="meta">${i.color}, ${i.size}</div>
          <div class="meta">${i.skuName}</div>
        </div>
        <div>
          <div>${money(i.price * i.qty)}</div>
          <div class="meta">${i.qty} шт.</div>
        </div>
      </div>
    `).join("")}
    <div class="big-price">${money(sum)}</div>
  `;
}

function openCart() {
  const el = $("#cartDrawer");
  el.hidden = false;
  el.classList.add("is-open");
  $("#cartBody").innerHTML = cartHTML();
}
function closeCart() {
  const el = $("#cartDrawer");
  el.hidden = true;
  el.classList.remove("is-open");
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const m = hash.match(/^\/product\/(\d+)/);
  if (m) renderProduct(m[1]);
  else renderCatalog();
}

async function init() {
  state.data = await (await fetch("data/products.json")).json();
  renderSizeFilters();
  saveCart();
  document.querySelectorAll("#filters .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.kind = btn.dataset.kind;
      document.querySelectorAll("#filters .chip").forEach((b) => b.classList.toggle("is-on", b === btn));
      if (!location.hash.startsWith("#/product")) renderCatalog();
      else location.hash = "#/";
    });
  });
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.query = $("#searchInput").value;
    location.hash = "#/";
    renderCatalog();
  });
  $("#searchInput").addEventListener("input", () => {
    state.query = $("#searchInput").value;
    if (!location.hash.startsWith("#/product")) renderCatalog();
  });
  $("#cartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  $("#cartDrawer").addEventListener("click", (e) => { if (e.target.id === "cartDrawer") closeCart(); });
  $("#catalogBtn").addEventListener("click", () => { location.hash = "#/"; });
  window.addEventListener("hashchange", route);
  route();
}

init();

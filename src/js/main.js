import {
  getMealsByFirstLetter,
  getMealsBySearch,
  getMealsByCategory,
  getMealsByArea,
  getMealDetails,
  getCategories,
  getIngredients,
  estimateNutrition,
} from "./api/mealdb.js";

import {
  appState,
  addFoodLogItem,
  removeFoodLogItem,
  saveFoodLog,
  toggleFavorite,
} from "./state/appState.js";

import {
  renderRecipeCards,
  renderMealDetails,
  renderProducts,
} from "./ui/components.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  loading: $("#app-loading-overlay"),
  sidebar: $("#sidebar"),
  sidebarOverlay: $("#sidebar-overlay"),
  sidebarClose: $("#sidebar-close-btn"),
  menuButton: $("#header-menu-btn"),
  navLinks: $$(".nav-link"),
  headerTitle: $("#header h1"),
  headerDescription: $("#header p"),
  searchInput: $("#search-input"),
  categoriesGrid: $("#categories-grid"),
  recipesGrid: $("#recipes-grid"),
  recipesCount: $("#recipes-count"),
  mealsSection: $("#all-recipes-section"),
  categoriesSection: $("#meal-categories-section"),
  filtersSection: $("#search-filters-section"),
  mealDetails: $("#meal-details"),
  productsSection: $("#products-section"),
  foodlogSection: $("#foodlog-section"),
  backButton: $("#back-to-meals-btn"),
  logMealButton: $("#log-meal-btn"),
  productSearch: $("#product-search-input"),
  productSearchButton: $("#search-product-btn"),
  barcodeInput: $("#barcode-input"),
  barcodeButton: $("#lookup-barcode-btn"),
  productsGrid: $("#products-grid"),
  productsCount: $("#products-count"),
  loggedItems: $("#logged-items-list"),
  clearFoodLog: $("#clear-foodlog"),
  weeklyChart: $("#weekly-chart"),
};

let searchTimer = null;
let currentProductCategory = "";
let activeSection = "meals";

function notify(title, text, icon = "info") {
  if (window.Swal) {
    return Swal.fire({ title, text, icon, confirmButtonColor: "#059669" });
  }
  window.alert(`${title}\n${text}`);
}

function setLoading(show) {
  if (!elements.loading) return;
  elements.loading.style.opacity = show ? "1" : "0";
  elements.loading.style.pointerEvents = show ? "auto" : "none";
  if (!show) {
    window.setTimeout(() => {
      if (elements.loading) elements.loading.style.display = "none";
    }, 500);
  }
}

function setSection(section) {
  activeSection = section;
  const sections = {
    meals: [elements.filtersSection, elements.categoriesSection, elements.mealsSection],
    details: [elements.mealDetails],
    products: [elements.productsSection],
    foodlog: [elements.foodlogSection],
  };

  Object.values(sections).flat().forEach(item => {
    if (item) item.style.display = "none";
  });
  (sections[section] || sections.meals).forEach(item => {
    if (item) item.style.display = "";
  });

  const titles = {
    meals: ["Meals & Recipes", "Discover delicious and nutritious recipes tailored for you"],
    details: ["Recipe Details", "Explore ingredients and cooking instructions"],
    products: ["Product Scanner", "Search packaged foods and explore nutrition information"],
    foodlog: ["Food Log", "Track and monitor your daily nutrition intake"],
  };
  if (elements.headerTitle) elements.headerTitle.textContent = titles[section][0];
  if (elements.headerDescription) elements.headerDescription.textContent = titles[section][1];

  elements.navLinks.forEach((link, index) => {
    const selected = (section === "meals" || section === "details") ? index === 0
      : section === "products" ? index === 1 : index === 2;
    link.classList.toggle("bg-emerald-50", selected);
    link.classList.toggle("text-emerald-700", selected);
    link.classList.toggle("text-gray-600", !selected);
    const label = link.querySelector("span");
    if (label) {
      label.classList.toggle("font-semibold", selected);
      label.classList.toggle("font-medium", !selected);
    }
  });

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (section === "foodlog") renderFoodLog();
}

function openSidebar() {
  elements.sidebar?.classList.add("sidebar-open");
  elements.sidebarOverlay?.classList.add("active");
  document.body.classList.add("sidebar-visible");
}
function closeSidebar() {
  elements.sidebar?.classList.remove("sidebar-open");
  elements.sidebarOverlay?.classList.remove("active");
  document.body.classList.remove("sidebar-visible");
}

function showError(error, context) {
  console.error(context, error);
  notify("Something went wrong", `${context}. Please check your internet connection and try again.`, "error");
}

async function loadInitialMeals() {
  try {
    const letters = ["a", "b", "c", "d", "e"];
    const groups = await Promise.all(letters.map(getMealsByFirstLetter));
    const unique = new Map();
    groups.flat().forEach(meal => unique.set(meal.idMeal, meal));
    appState.meals = [...unique.values()].slice(0, 25);
    renderMeals();
  } catch (error) {
    showError(error, "Unable to load recipes");
    if (elements.recipesGrid) {
      elements.recipesGrid.innerHTML = `<div class="col-span-full text-center bg-white rounded-xl p-8 text-gray-500">Could not load recipes right now.</div>`;
    }
  }
}

function renderMeals() {
  renderRecipeCards(appState.meals, elements.recipesGrid);
  if (elements.recipesCount) {
    elements.recipesCount.textContent = `Showing ${appState.meals.length} ${appState.meals.length === 1 ? "recipe" : "recipes"}`;
  }
  applyView();
}

function applyView() {
  if (!elements.recipesGrid) return;
  const isList = appState.currentView === "list";
  elements.recipesGrid.classList.toggle("grid-cols-1", isList);
  elements.recipesGrid.classList.toggle("grid-cols-4", !isList);
  elements.recipesGrid.classList.toggle("md:grid-cols-2", !isList);
  elements.recipesGrid.classList.toggle("lg:grid-cols-3", !isList);
  elements.recipesGrid.classList.toggle("xl:grid-cols-4", !isList);
  $$("#grid-view-btn, #list-view-btn").forEach(button => {
    const selected = button.id === (isList ? "list-view-btn" : "grid-view-btn");
    button.classList.toggle("bg-white", selected);
    button.classList.toggle("rounded-md", selected);
    button.classList.toggle("shadow-sm", selected);
  });
}

async function searchMeals(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    await loadInitialMeals();
    return;
  }
  try {
    const meals = await getMealsBySearch(trimmed);
    appState.meals = meals;
    appState.currentFilter = { type: "search", value: trimmed };
    renderMeals();
  } catch (error) {
    showError(error, "Recipe search failed");
  }
}

async function filterMeals(type, value) {
  try {
    let meals = [];
    if (type === "category") meals = await getMealsByCategory(value);
    if (type === "area") meals = await getMealsByArea(value);
    appState.meals = meals;
    appState.currentFilter = { type, value };
    renderMeals();
    setSection("meals");
  } catch (error) {
    showError(error, "Unable to filter recipes");
  }
}

async function openMeal(id) {
  try {
    const meal = await getMealDetails(id);
    if (!meal) {
      notify("Recipe not found", "This recipe is no longer available.", "warning");
      return;
    }
    appState.currentMeal = meal;
    renderMealDetails(meal, elements.mealDetails);
    setSection("details");
  } catch (error) {
    showError(error, "Unable to open recipe");
  }
}

let mealLogServings = 1;

function createMealLogModal() {
  if (document.querySelector("#meal-log-modal")) return;

  const styles = document.createElement("style");
  styles.id = "meal-log-modal-styles";
  styles.textContent = `
    #meal-log-modal { position: fixed; inset: 0; z-index: 10000; display: none; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.52); }
    #meal-log-modal.is-open { display: flex; }
    #meal-log-modal .meal-log-dialog { width: min(100%, 448px); background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 24px 70px rgba(15,23,42,.24); color: #172033; }
    #meal-log-modal .meal-log-heading { display:flex; align-items:center; gap:16px; margin-bottom:26px; }
    #meal-log-modal .meal-log-thumb { width:64px; height:64px; border-radius:12px; object-fit:cover; flex:none; background:#f3f4f6; }
    #meal-log-modal .meal-log-title { margin:0; font-size:20px; line-height:1.25; font-weight:750; }
    #meal-log-modal .meal-log-name { margin:4px 0 0; color:#64748b; font-size:14px; }
    #meal-log-modal .meal-log-label { display:block; margin-bottom:10px; color:#344256; font-size:14px; font-weight:650; }
    #meal-log-modal .meal-log-stepper { display:flex; align-items:center; gap:12px; }
    #meal-log-modal .meal-log-stepper button { width:40px; height:40px; border:0; border-radius:10px; background:#f1f3f6; color:#475569; font-size:24px; line-height:1; cursor:pointer; }
    #meal-log-modal .meal-log-stepper button:hover { background:#e5eaf0; }
    #meal-log-modal .meal-log-count { width:80px; height:44px; display:flex; align-items:center; justify-content:center; border:1px solid #d7dce4; border-radius:9px; font-size:18px; font-weight:650; color:#172033; }
    #meal-log-modal .meal-log-nutrition { margin-top:24px; padding:18px 16px 15px; border-radius:13px; background:#eafbf4; }
    #meal-log-modal .meal-log-nutrition-caption { margin:0 0 14px; color:#526274; font-size:14px; }
    #meal-log-modal .meal-log-nutrition-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; text-align:center; }
    #meal-log-modal .meal-log-nutrition-value { margin:0; font-size:18px; line-height:1.3; font-weight:750; }
    #meal-log-modal .meal-log-nutrition-unit { margin:3px 0 0; color:#64748b; font-size:12px; }
    #meal-log-modal .meal-log-calories { color:#059669; } #meal-log-modal .meal-log-protein { color:#2563eb; }
    #meal-log-modal .meal-log-carbs { color:#ea580c; } #meal-log-modal .meal-log-fat { color:#9333ea; }
    #meal-log-modal .meal-log-actions { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:24px; }
    #meal-log-modal .meal-log-actions button { min-height:48px; border:0; border-radius:12px; font-size:15px; font-weight:700; cursor:pointer; }
    #meal-log-modal .meal-log-cancel { background:#f1f3f6; color:#344256; }
    #meal-log-modal .meal-log-confirm { background:#1d5cff; color:#fff; }
    #meal-log-modal .meal-log-confirm:hover { background:#164bd6; }
    @media (max-width:480px) { #meal-log-modal .meal-log-dialog { padding:20px; } #meal-log-modal .meal-log-title { font-size:18px; } #meal-log-modal .meal-log-nutrition-value { font-size:16px; } }
  `;
  document.head.appendChild(styles);

  const modal = document.createElement("div");
  modal.id = "meal-log-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="meal-log-dialog" role="dialog" aria-modal="true" aria-labelledby="meal-log-title">
      <div class="meal-log-heading">
        <img class="meal-log-thumb" id="meal-log-image" src="" alt="">
        <div><h2 class="meal-log-title" id="meal-log-title">Log This Meal</h2><p class="meal-log-name" id="meal-log-name"></p></div>
      </div>
      <div>
        <label class="meal-log-label">Number of Servings</label>
        <div class="meal-log-stepper">
          <button type="button" id="meal-log-decrease" aria-label="Decrease servings">−</button>
          <output class="meal-log-count" id="meal-log-count" aria-live="polite">1</output>
          <button type="button" id="meal-log-increase" aria-label="Increase servings">+</button>
        </div>
      </div>
      <div class="meal-log-nutrition">
        <p class="meal-log-nutrition-caption" id="meal-log-nutrition-caption">Estimated nutrition for 1 serving:</p>
        <div class="meal-log-nutrition-grid">
          <div><p class="meal-log-nutrition-value meal-log-calories" id="meal-log-calories">0</p><p class="meal-log-nutrition-unit">Calories</p></div>
          <div><p class="meal-log-nutrition-value meal-log-protein" id="meal-log-protein">0g</p><p class="meal-log-nutrition-unit">Protein</p></div>
          <div><p class="meal-log-nutrition-value meal-log-carbs" id="meal-log-carbs">0g</p><p class="meal-log-nutrition-unit">Carbs</p></div>
          <div><p class="meal-log-nutrition-value meal-log-fat" id="meal-log-fat">0g</p><p class="meal-log-nutrition-unit">Fat</p></div>
        </div>
      </div>
      <div class="meal-log-actions">
        <button type="button" class="meal-log-cancel" id="meal-log-cancel">Cancel</button>
        <button type="button" class="meal-log-confirm" id="meal-log-confirm"><i class="fa-solid fa-clipboard-list"></i>&nbsp; Log Meal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener("click", event => {
    if (event.target === modal || event.target.closest("#meal-log-cancel")) closeMealLogModal();
    if (event.target.closest("#meal-log-decrease")) {
      mealLogServings = Math.max(1, mealLogServings - 1);
      updateMealLogPreview();
    }
    if (event.target.closest("#meal-log-increase")) {
      mealLogServings = Math.min(99, mealLogServings + 1);
      updateMealLogPreview();
    }
    if (event.target.closest("#meal-log-confirm")) confirmMealLog();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) closeMealLogModal();
  });
}

function openMealLogModal() {
  const meal = appState.currentMeal;
  if (!meal) return;
  createMealLogModal();
  mealLogServings = 1;
  const modal = $("#meal-log-modal");
  $("#meal-log-image").src = meal.strMealThumb || "";
  $("#meal-log-image").alt = meal.strMeal || "Meal";
  $("#meal-log-name").textContent = meal.strMeal || "Selected meal";
  updateMealLogPreview();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $("#meal-log-cancel")?.focus();
}

function updateMealLogPreview() {
  const meal = appState.currentMeal;
  if (!meal) return;
  const nutrition = estimateNutrition(meal);
  const total = key => Math.round((Number(nutrition[key]) || 0) * mealLogServings * 10) / 10;
  $("#meal-log-count").textContent = String(mealLogServings);
  $("#meal-log-nutrition-caption").textContent = `Estimated nutrition for ${mealLogServings} ${mealLogServings === 1 ? "serving" : "servings"}:`;
  $("#meal-log-calories").textContent = total("calories").toLocaleString();
  $("#meal-log-protein").textContent = `${total("protein")}g`;
  $("#meal-log-carbs").textContent = `${total("carbs")}g`;
  $("#meal-log-fat").textContent = `${total("fat")}g`;
}

function closeMealLogModal() {
  const modal = $("#meal-log-modal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function confirmMealLog() {
  const meal = appState.currentMeal;
  if (!meal) return;
  const nutrition = estimateNutrition(meal);
  addFoodLogItem({
    type: "meal",
    sourceId: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    servings: mealLogServings,
    calories: Math.round(nutrition.calories * mealLogServings * 10) / 10,
    protein: Math.round(nutrition.protein * mealLogServings * 10) / 10,
    carbs: Math.round(nutrition.carbs * mealLogServings * 10) / 10,
    fat: Math.round(nutrition.fat * mealLogServings * 10) / 10,
  });
  closeMealLogModal();
  renderFoodLog();
  if (window.Swal) {
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Meal added to Food Log", showConfirmButton: false, timer: 2200, timerProgressBar: true });
  }
}

function bindMealEvents() {
  elements.searchInput?.addEventListener("input", event => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => searchMeals(event.target.value), 350);
  });

  elements.categoriesGrid?.addEventListener("click", event => {
    const card = event.target.closest("[data-category]");
    if (card) filterMeals("category", card.dataset.category);
  });

  $("#search-filters-section")?.addEventListener("click", event => {
    const areaButton = event.target.closest("[data-area]");
    if (areaButton) {
      $$("#search-filters-section [data-area]").forEach(button => {
        button.classList.remove("bg-emerald-600", "text-white");
        button.classList.add("bg-gray-100", "text-gray-700");
      });
      areaButton.classList.remove("bg-gray-100", "text-gray-700");
      areaButton.classList.add("bg-emerald-600", "text-white");
      filterMeals("area", areaButton.dataset.area);
    } else if (event.target.closest("button")?.textContent.trim() === "All Recipes") {
      elements.searchInput.value = "";
      appState.currentFilter = { type: "all", value: "" };
      loadInitialMeals();
    }
  });

  elements.recipesGrid?.addEventListener("click", event => {
    const favoriteButton = event.target.closest("[data-favorite-id]");
    if (favoriteButton) {
      event.stopPropagation();
      toggleFavorite(favoriteButton.dataset.favoriteId);
      const icon = favoriteButton.querySelector("i");
      icon.classList.toggle("fa-solid");
      icon.classList.toggle("fa-regular");
      icon.classList.toggle("text-red-500");
      icon.classList.toggle("text-gray-500");
      return;
    }
    const openButton = event.target.closest("[data-meal-id]");
    const card = event.target.closest(".recipe-card");
    const id = openButton?.dataset.mealId || card?.dataset.mealId;
    if (id) openMeal(id);
  });

  elements.backButton?.addEventListener("click", () => setSection("meals"));
  $("#grid-view-btn")?.addEventListener("click", () => {
    appState.currentView = "grid";
    applyView();
  });
  $("#list-view-btn")?.addEventListener("click", () => {
    appState.currentView = "list";
    applyView();
  });
  elements.logMealButton?.addEventListener("click", openMealLogModal);
}

async function getProductsBySearch(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=24`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Open Food Facts search failed");
  const data = await response.json();
  return data.products || [];
}

async function getProductByBarcode(barcode) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
  if (!response.ok) throw new Error("Barcode lookup failed");
  const data = await response.json();
  return data.status === 1 && data.product ? [{ ...data.product, code: barcode }] : [];
}

function filterProducts() {
  const grade = appState.productGrade;
  const filtered = appState.productResults.filter(product => {
    const productGrade = (product.nutriscore_grade || product.nutrition_grades || "").toLowerCase();
    return !grade || productGrade === grade;
  });
  renderProducts(filtered, elements.productsGrid);
  if (elements.productsCount) {
    elements.productsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "product" : "products"} found`;
  }
}

async function searchProducts() {
  const query = elements.productSearch?.value.trim();
  if (!query) {
    notify("Enter a product name", "Type a product name before searching.", "warning");
    elements.productSearch?.focus();
    return;
  }
  elements.productsCount.textContent = "Searching...";
  try {
    appState.productResults = await getProductsBySearch(query);
    appState.productGrade = "";
    $$(".nutri-score-filter").forEach(button => button.classList.remove("ring-2", "ring-emerald-500"));
    filterProducts();
  } catch (error) {
    showError(error, "Product search failed");
  }
}

async function lookupBarcode() {
  const barcode = elements.barcodeInput?.value.trim();
  if (!barcode) {
    notify("Enter a barcode", "Type the barcode number before lookup.", "warning");
    elements.barcodeInput?.focus();
    return;
  }
  elements.productsCount.textContent = "Looking up barcode...";
  try {
    appState.productResults = await getProductByBarcode(barcode);
    appState.productGrade = "";
    filterProducts();
    if (!appState.productResults.length) {
      notify("Product not found", "No product matched this barcode.", "warning");
    }
  } catch (error) {
    showError(error, "Barcode lookup failed");
  }
}

function bindProductEvents() {
  elements.productSearchButton?.addEventListener("click", searchProducts);
  elements.productSearch?.addEventListener("keydown", event => {
    if (event.key === "Enter") searchProducts();
  });
  elements.barcodeButton?.addEventListener("click", lookupBarcode);
  elements.barcodeInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") lookupBarcode();
  });

  $$(".nutri-score-filter").forEach(button => {
    button.addEventListener("click", () => {
      appState.productGrade = button.dataset.grade || "";
      $$(".nutri-score-filter").forEach(item => item.classList.remove("ring-2", "ring-emerald-500"));
      button.classList.add("ring-2", "ring-emerald-500");
      filterProducts();
    });
  });

  $("#product-categories")?.addEventListener("click", event => {
    const button = event.target.closest(".product-category-btn");
    if (!button) return;
    const label = button.textContent.trim().toLowerCase();
    const terms = {
      snacks: "snacks",
      beverages: "beverages",
      breakfast: "breakfast",
      desserts: "desserts",
      dairy: "dairy",
    };
    currentProductCategory = terms[label] || label;
    elements.productSearch.value = currentProductCategory;
    searchProducts();
  });

  elements.productsGrid?.addEventListener("click", event => {
    const button = event.target.closest(".log-product-btn");
    if (!button) return;
    const product = appState.productResults.find(item => String(item.code) === String(button.dataset.barcode));
    if (!product) return;
    const n = product.nutriments || {};
    addFoodLogItem({
      type: "product",
      sourceId: product.code,
      name: product.product_name || "Food product",
      image: product.image_front_url || product.image_url || "",
      calories: Number(n["energy-kcal_100g"]) || 0,
      protein: Number(n.proteins_100g) || 0,
      carbs: Number(n.carbohydrates_100g) || 0,
      fat: Number(n.fat_100g) || 0,
    });
    notify("Product added", `${product.product_name || "Product"} was added to your food log.`, "success");
  });
}

function renderFoodLog() {
  const today = new Date().toISOString().slice(0, 10);
  const todaysItems = appState.foodLog.filter(item => item.date === today);
  const totals = todaysItems.reduce((sum, item) => {
    sum.calories += Number(item.calories) || 0;
    sum.protein += Number(item.protein) || 0;
    sum.carbs += Number(item.carbs) || 0;
    sum.fat += Number(item.fat) || 0;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  if ($("#foodlog-date")) {
    $("#foodlog-date").textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric"
    });
  }

  const progressCards = $$("#foodlog-today-section > div.grid > div");
  const progress = [
    { key: "calories", goal: 2000, unit: "kcal", color: "bg-emerald-500" },
    { key: "protein", goal: 50, unit: "g", color: "bg-blue-500" },
    { key: "carbs", goal: 250, unit: "g", color: "bg-amber-500" },
    { key: "fat", goal: 65, unit: "g", color: "bg-purple-500" },
  ];
  progressCards.forEach((card, index) => {
    const item = progress[index];
    if (!item) return;
    const value = Math.round(totals[item.key] * 10) / 10;
    const text = card.querySelector(".flex.items-center.justify-between span:last-child");
    const bar = card.querySelector(".w-full > div");
    if (text) text.textContent = `${value} / ${item.goal} ${item.unit}`;
    if (bar) bar.style.width = `${Math.min(100, value / item.goal * 100)}%`;
  });

  const loggedTitle = elements.foodlogSection?.querySelector("#foodlog-today-section h4");
  if (loggedTitle) loggedTitle.textContent = `Logged Items (${todaysItems.length})`;

  if (elements.clearFoodLog) elements.clearFoodLog.style.display = todaysItems.length ? "inline-flex" : "none";

  if (elements.loggedItems) {
    if (!todaysItems.length) {
      elements.loggedItems.innerHTML = `<div class="text-center py-8 text-gray-500">
        <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">No meals logged today</p>
        <p class="text-sm">Add meals from the Meals page or scan products</p>
      </div>`;
    } else {
      elements.loggedItems.innerHTML = todaysItems.map(item => `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl" data-log-id="${item.id}">
          ${item.image ? `<img src="${item.image}" alt="" class="w-14 h-14 rounded-lg object-cover">` : `<div class="w-14 h-14 rounded-lg bg-emerald-100 flex items-center justify-center"><i class="fa-solid fa-utensils text-emerald-600"></i></div>`}
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 truncate">${escapeText(item.name)}</p>
            <p class="text-xs text-gray-500">${Math.round(item.calories || 0)} kcal · P ${item.protein || 0}g · C ${item.carbs || 0}g · F ${item.fat || 0}g</p>
          </div>
          <button type="button" class="remove-log-item text-red-500 hover:text-red-700 p-2" data-remove-id="${item.id}" aria-label="Remove item"><i class="fa-solid fa-trash"></i></button>
        </div>`).join("");
    }
  }

  renderWeeklyChart();
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function renderWeeklyChart() {
  if (!elements.weeklyChart) return;
  if (!window.Plotly) {
    elements.weeklyChart.textContent = "Weekly chart is unavailable because Plotly did not load.";
    return;
  }
  const dates = [];
  const calories = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    dates.push(date.toLocaleDateString(undefined, { weekday: "short" }));
    calories.push(appState.foodLog.filter(item => item.date === key)
      .reduce((total, item) => total + (Number(item.calories) || 0), 0));
  }
  window.Plotly.newPlot(elements.weeklyChart, [{
    x: dates, y: calories, type: "bar",
    marker: { color: "#10b981" },
    hovertemplate: "%{x}<br>%{y} kcal<extra></extra>",
  }], {
    margin: { t: 12, r: 12, b: 32, l: 42 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    yaxis: { title: "Calories", rangemode: "tozero", gridcolor: "#e5e7eb" },
    xaxis: { fixedrange: true },
    font: { family: "Inter, sans-serif", color: "#6b7280" },
  }, { responsive: true, displayModeBar: false });
}

function bindFoodLogEvents() {
  elements.clearFoodLog?.addEventListener("click", async () => {
    const confirmed = window.Swal
      ? await Swal.fire({ title: "Clear today's food log?", text: "This removes all items logged today.", icon: "warning", showCancelButton: true, confirmButtonText: "Clear All", confirmButtonColor: "#dc2626" })
      : { isConfirmed: window.confirm("Clear today's food log?") };
    if (!confirmed.isConfirmed) return;
    const today = new Date().toISOString().slice(0, 10);
    appState.foodLog = appState.foodLog.filter(item => item.date !== today);
    saveFoodLog();
    renderFoodLog();
  });

  elements.loggedItems?.addEventListener("click", event => {
    const button = event.target.closest("[data-remove-id]");
    if (!button) return;
    removeFoodLogItem(button.dataset.removeId);
    renderFoodLog();
  });

  $$(".quick-log-btn").forEach((button, index) => {
    button.addEventListener("click", () => {
      if (index === 0) setSection("meals");
      if (index === 1) setSection("products");
      if (index === 2) customFoodEntry();
    });
  });
}

async function customFoodEntry() {
  if (!window.Swal) {
    notify("Custom entry", "SweetAlert2 is required for custom food entry.", "warning");
    return;
  }
  const result = await Swal.fire({
    title: "Add Custom Food",
    html: `<input id="custom-food-name" class="swal2-input" placeholder="Food name">
      <input id="custom-food-calories" class="swal2-input" type="number" min="0" placeholder="Calories">
      <input id="custom-food-protein" class="swal2-input" type="number" min="0" placeholder="Protein (g)">
      <input id="custom-food-carbs" class="swal2-input" type="number" min="0" placeholder="Carbs (g)">
      <input id="custom-food-fat" class="swal2-input" type="number" min="0" placeholder="Fat (g)">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Add Food",
    confirmButtonColor: "#059669",
    preConfirm: () => {
      const name = $("#custom-food-name")?.value.trim();
      const calories = Number($("#custom-food-calories")?.value);
      if (!name || !$("#custom-food-calories")?.value || calories < 0) {
        Swal.showValidationMessage("Enter a food name and valid calories.");
        return false;
      }
      return {
        name, calories,
        protein: Number($("#custom-food-protein")?.value) || 0,
        carbs: Number($("#custom-food-carbs")?.value) || 0,
        fat: Number($("#custom-food-fat")?.value) || 0,
      };
    },
  });
  if (result.isConfirmed) {
    addFoodLogItem({ type: "custom", ...result.value });
    renderFoodLog();
    notify("Food added", `${result.value.name} was added to your food log.`, "success");
  }
}

function bindNavigation() {
  elements.navLinks.forEach((link, index) => {
    link.addEventListener("click", event => {
      event.preventDefault();
      setSection(index === 0 ? "meals" : index === 1 ? "products" : "foodlog");
    });
  });
  elements.menuButton?.addEventListener("click", openSidebar);
  elements.sidebarClose?.addEventListener("click", closeSidebar);
  elements.sidebarOverlay?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSidebar();
  });
}

function bindIngredientChecks() {
  elements.mealDetails?.addEventListener("change", event => {
    if (event.target.matches(".ingredient-checkbox")) {
      const label = event.target.closest("label, .flex.items-center.gap-3");
      label?.classList.toggle("opacity-50", event.target.checked);
    }
  });
}

function initializeStaticCategories() {
  // The supplied HTML already contains the designed category cards.
  // Keep those cards and their original styling; JavaScript only activates them.
  getCategories().catch(error => console.warn("Categories API is unavailable; using the categories in the supplied HTML.", error));
}

async function init() {
  setSection("meals");
  bindNavigation();
  bindMealEvents();
  bindProductEvents();
  bindFoodLogEvents();
  bindIngredientChecks();
  createMealLogModal();
  initializeStaticCategories();
  renderFoodLog();
  await loadInitialMeals();
  setLoading(false);
}

document.addEventListener("DOMContentLoaded", init);

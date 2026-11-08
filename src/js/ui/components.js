import { getIngredients, estimateNutrition } from "../api/mealdb.js";
import { appState } from "../state/appState.js";

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

export function renderRecipeCards(meals, container) {
  if (!meals.length) {
    container.innerHTML = `<div class="col-span-full bg-white rounded-xl p-10 text-center text-gray-500">
      <i class="fa-solid fa-bowl-food text-4xl text-gray-300 mb-3"></i>
      <p class="font-semibold">No recipes found</p><p class="text-sm mt-1">Try another search or filter.</p>
    </div>`;
    return;
  }

  container.innerHTML = meals.map(meal => {
    const category = meal.strCategory || "Recipe";
    const area = meal.strArea || "International";
    const description = (meal.strInstructions || "Discover this delicious recipe and learn how to prepare it.")
      .replace(/\s+/g, " ")
      .trim();
    const shortDescription = description.length > 112
      ? `${description.slice(0, 112).trim()}...`
      : description;

    return `<article class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer" data-meal-id="${escapeHTML(meal.idMeal)}">
      <div class="relative h-48 overflow-hidden bg-gray-100">
        <img src="${escapeHTML(meal.strMealThumb)}" alt="${escapeHTML(meal.strMeal)}"
          class="w-full h-full object-cover" loading="lazy">
        <div class="absolute bottom-3 left-3 flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 bg-white text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm">
            <i class="fa-solid fa-tag text-emerald-600"></i>${escapeHTML(category)}
          </span>
          <span class="inline-flex items-center gap-1.5 bg-white text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm">
            <i class="fa-solid fa-globe text-blue-500"></i>${escapeHTML(area)}
          </span>
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-bold text-gray-900 text-base leading-5 mb-2">${escapeHTML(meal.strMeal)}</h3>
        <p class="text-xs leading-4 text-gray-600 mb-3 line-clamp-2">${escapeHTML(shortDescription)}</p>
        <div class="flex items-center justify-between gap-3 text-xs text-gray-600">
          <span class="inline-flex items-center gap-2 min-w-0">
            <i class="fa-solid fa-utensils text-emerald-600"></i>
            <span class="truncate">${escapeHTML(category)}</span>
          </span>
          <span class="inline-flex items-center gap-2 min-w-0">
            <i class="fa-solid fa-globe text-blue-500"></i>
            <span class="truncate">${escapeHTML(area)}</span>
          </span>
        </div>
      </div>
    </article>`;
  }).join("");
}

export function renderMealDetails(meal, section) {
  const ingredients = getIngredients(meal);
  const nutrition = estimateNutrition(meal);

  const hero = section.querySelector(".relative.h-80");
  const heroImage = hero?.querySelector("img");
  if (heroImage) {
    heroImage.src = meal.strMealThumb;
    heroImage.alt = meal.strMeal;
  }

  const heroHeading = hero?.querySelector("h1");
  if (heroHeading) heroHeading.textContent = meal.strMeal;

  const heroSpans = hero?.querySelectorAll(".flex.items-center.gap-3.mb-3 span");
  if (heroSpans?.[0]) heroSpans[0].textContent = meal.strCategory || "Meal";
  if (heroSpans?.[1]) heroSpans[1].textContent = meal.strArea || "International";
  if (heroSpans?.[2]) heroSpans[2].textContent = "Recipe";

  const heroInfo = hero?.querySelectorAll(".flex.items-center.gap-6 > span");
  if (heroInfo?.[0]) heroInfo[0].lastElementChild.textContent = "See instructions";
  if (heroInfo?.[1]) heroInfo[1].lastElementChild.textContent = `${ingredients.length} ingredients`;
  if (heroInfo?.[2]) heroInfo[2].lastElementChild.textContent = `~${nutrition.calories} cal/serving`;

  const ingredientHeading = [...section.querySelectorAll("h2")].find(h => h.textContent.includes("Ingredients"));
  const ingredientCard = ingredientHeading?.parentElement;
  const ingredientGrid = ingredientCard?.querySelector(".grid");
  if (ingredientHeading) {
    const count = ingredientHeading.querySelector("span");
    if (count) count.textContent = `${ingredients.length} items`;
  }
  if (ingredientGrid) {
    ingredientGrid.innerHTML = ingredients.map(({ ingredient, measure }) => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
        <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300">
        <span class="text-gray-700"><span class="font-medium text-gray-900">${escapeHTML(measure)}</span> ${escapeHTML(ingredient)}</span>
      </label>`).join("");
  }

  const instructionHeading = [...section.querySelectorAll("h2")].find(h => h.textContent.includes("Instructions"));
  const instructionContainer = instructionHeading?.parentElement?.querySelector(".space-y-4");
  if (instructionContainer) {
    const steps = (meal.strInstructions || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    instructionContainer.innerHTML = steps.map((step, index) => `
      <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
        <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${index + 1}</div>
        <p class="text-gray-700 leading-relaxed pt-2">${escapeHTML(step)}</p>
      </div>`).join("");
  }

  const nutritionContainer = section.querySelector("#nutrition-facts-container");
  if (nutritionContainer) {
    const calorieBlock = nutritionContainer.querySelector(".text-center.py-4");
    if (calorieBlock) {
      const values = calorieBlock.querySelectorAll("p");
      if (values[1]) values[1].textContent = `~${nutrition.calories}`;
      if (values[2]) values[2].textContent = "Estimated value; recipe data has no official nutrition facts";
    }
  }

  const logButton = section.querySelector("#log-meal-btn");
  if (logButton) logButton.dataset.mealId = meal.idMeal;
}

export function renderProducts(products, container) {
  if (!products.length) {
    container.innerHTML = `<div class="col-span-full bg-white rounded-xl p-10 text-center text-gray-500">
      <i class="fa-solid fa-magnifying-glass text-4xl text-gray-300 mb-3"></i>
      <p class="font-semibold">No products found</p><p class="text-sm mt-1">Try another name or barcode.</p>
    </div>`;
    return;
  }

  container.innerHTML = products.map(product => {
    const n = product.nutriments || {};
    const grade = (product.nutriscore_grade || product.nutrition_grades || "").toLowerCase();
    const image = product.image_front_url || product.image_url || "";
    const barcode = product.code || "";
    return `<article class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${escapeHTML(barcode)}">
      <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        ${image ? `<img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" src="${escapeHTML(image)}" alt="${escapeHTML(product.product_name || "Food product")}" loading="lazy">` : `<i class="fa-solid fa-box-open text-4xl text-gray-300"></i>`}
        ${grade ? `<div class="absolute top-2 left-2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">Nutri-Score ${escapeHTML(grade)}</div>` : ""}
      </div>
      <div class="p-4">
        <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${escapeHTML(product.brands || "Brand not listed")}</p>
        <h3 class="font-bold text-gray-900 mb-2 line-clamp-2">${escapeHTML(product.product_name || "Unnamed product")}</h3>
        <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span><i class="fa-solid fa-weight-scale mr-1"></i>${escapeHTML(product.quantity || "Size n/a")}</span>
          <span><i class="fa-solid fa-fire mr-1"></i>${Number.isFinite(Number(n["energy-kcal_100g"])) ? Math.round(n["energy-kcal_100g"]) + " kcal/100g" : "Calories n/a"}</span>
        </div>
        <div class="grid grid-cols-4 gap-1 text-center">
          <div class="bg-emerald-50 rounded p-1.5"><p class="text-xs font-bold text-emerald-700">${fmt(n.proteins_100g)}g</p><p class="text-[10px] text-gray-500">Protein</p></div>
          <div class="bg-blue-50 rounded p-1.5"><p class="text-xs font-bold text-blue-700">${fmt(n.carbohydrates_100g)}g</p><p class="text-[10px] text-gray-500">Carbs</p></div>
          <div class="bg-purple-50 rounded p-1.5"><p class="text-xs font-bold text-purple-700">${fmt(n.fat_100g)}g</p><p class="text-[10px] text-gray-500">Fat</p></div>
          <div class="bg-orange-50 rounded p-1.5"><p class="text-xs font-bold text-orange-700">${fmt(n.sugars_100g)}g</p><p class="text-[10px] text-gray-500">Sugar</p></div>
        </div>
        <button type="button" class="log-product-btn mt-4 w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700" data-barcode="${escapeHTML(barcode)}">Add to Food Log</button>
      </div>
    </article>`;
  }).join("");
}

function fmt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "—";
}

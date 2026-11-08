const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

async function request(endpoint) {
  const response = await fetch(`${BASE_URL}/${endpoint}`);
  if (!response.ok) throw new Error(`TheMealDB request failed (${response.status})`);
  return response.json();
}

export async function getMealsByFirstLetter(letter = "a") {
  const data = await request(`search.php?f=${encodeURIComponent(letter)}`);
  return data.meals || [];
}

export async function getMealsBySearch(query) {
  const data = await request(`search.php?s=${encodeURIComponent(query)}`);
  return data.meals || [];
}

export async function getMealsByCategory(category) {
  const data = await request(`filter.php?c=${encodeURIComponent(category)}`);
  return data.meals || [];
}

export async function getMealsByArea(area) {
  const data = await request(`filter.php?a=${encodeURIComponent(area)}`);
  return data.meals || [];
}

export async function getMealDetails(id) {
  const data = await request(`lookup.php?i=${encodeURIComponent(id)}`);
  return data.meals?.[0] || null;
}

export async function getCategories() {
  const data = await request("categories.php");
  return data.categories || [];
}

export async function getRandomMeal() {
  const data = await request("random.php");
  return data.meals?.[0] || null;
}

export function getIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (ingredient) ingredients.push({ ingredient, measure: measure || "" });
  }
  return ingredients;
}

export function estimateNutrition(meal) {
  // TheMealDB does not provide nutrition facts. Keep these estimates clearly marked.
  const ingredients = getIngredients(meal);
  const text = `${meal.strMeal || ""} ${ingredients.map(x => x.ingredient).join(" ")}`.toLowerCase();
  let calories = 350;
  if (/chicken|beef|lamb|pork|salmon|tuna|fish/.test(text)) calories += 120;
  if (/rice|pasta|potato|bread|noodle/.test(text)) calories += 100;
  if (/cream|cheese|butter|oil/.test(text)) calories += 80;
  return { calories, protein: 25, carbs: 35, fat: 14, fiber: 4, estimated: true };
}

const FOOD_LOG_KEY = "nutriplan-food-log-v1";
const FAVORITES_KEY = "nutriplan-favorites-v1";

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export const appState = {
  meals: [],
  currentMeal: null,
  currentFilter: { type: "all", value: "" },
  currentView: "grid",
  productResults: [],
  productGrade: "",
  foodLog: readJSON(FOOD_LOG_KEY, []),
  favorites: readJSON(FAVORITES_KEY, []),
};

export function saveFoodLog() {
  localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(appState.foodLog));
}

export function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(appState.favorites));
}

export function addFoodLogItem(item) {
  appState.foodLog.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: new Date().toISOString().slice(0, 10),
    loggedAt: new Date().toISOString(),
    ...item,
  });
  saveFoodLog();
}

export function removeFoodLogItem(id) {
  appState.foodLog = appState.foodLog.filter(item => item.id !== id);
  saveFoodLog();
}

export function toggleFavorite(id) {
  const exists = appState.favorites.includes(String(id));
  appState.favorites = exists
    ? appState.favorites.filter(item => item !== String(id))
    : [...appState.favorites, String(id)];
  saveFavorites();
  return !exists;
}

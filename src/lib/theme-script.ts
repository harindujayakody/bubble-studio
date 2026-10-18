/** localStorage key for the theme choice ("light" / "dark"; absent = follow the system). */
export const THEME_KEY = "bubble-studio:theme";

/** Runs in <head> before first paint, so the page never flashes the wrong theme. Mirrors apply() in theme.ts. */
export const THEME_SCRIPT = `try{var p=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d)r.classList.add("dark");r.style.colorScheme=d?"dark":"light"}catch(e){}`;

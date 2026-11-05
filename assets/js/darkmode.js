// Default to light mode; visitors can still switch with the toggle

const toggleDarkMode = document.getElementById('btnSwitch')

toggleDarkMode.addEventListener('click', () => {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark')
    localStorage.setItem("theme", "light")
  } else {
    document.documentElement.classList.add('dark')
    localStorage.setItem("theme", "dark")
  }
})

const setDarkMode = (active = false) => {
  const wrapper = document.documentElement.classList;
  if (active) {
    wrapper.add('dark');
    toggleDarkMode.checked = true;
  } else {
    wrapper.remove('dark');
    toggleDarkMode.checked = false;
  }
};

// Only go dark if the visitor has explicitly chosen it with the toggle
setDarkMode(localStorage.getItem("theme") === "dark");

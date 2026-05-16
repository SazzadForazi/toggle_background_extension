# toggle_background_extension

A small drawing and analysis project with two parts:

- A Vite + React app for a clean drawing workspace with a toggleable light or dark background
- A Chrome extension that adds a floating drawing overlay on websites for notes, chart explanation, and markup

## Benefits

- Quickly switch between light and dark backgrounds for clearer screenshots and presentations
- Draw support, resistance, zones, arrows, and notes directly on top of browser content
- Keep normal browsing separate from drawing with toggleable browse and draw modes
- Save drawings per page so your markup stays available when you revisit the same view
- Use it as a simple explanation board for trading, teaching, or browser-based demos

## Project Setup

### Requirements

- Node.js 18 or newer
- npm
- Google Chrome or another Chromium-based browser for the extension

### Install dependencies

```bash
npm install
```

### Run the development app

```bash
npm run dev
```

This starts the local Vite app so you can use the drawing workspace in the browser.

### Build the project

```bash
npm run build
```

This creates the production build in `dist/`.

### Preview the production build

```bash
npm run preview
```

## Chrome Extension Setup

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the `extension` folder from this project
5. Open any supported page and the floating toolbar will appear

## How To Use

- Use `Browse` mode when you want to interact with the website normally
- Use `Draw` mode when you want to draw on top of the page
- Press `Esc` to quickly switch between browse and draw modes
- Use `Ctrl+Z` / `Cmd+Z` for undo
- Use `Ctrl+Y`, `Cmd+Y`, or `Cmd+Shift+Z` for redo
- Use `Delete` to remove the selected object

## Project Structure

- `src/` contains the React drawing app
- `extension/` contains the Chrome extension files
- `dist/` contains the built output

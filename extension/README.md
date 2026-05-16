# Chrome Extension Use

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the `extension` folder inside this project
5. Open `Quotex` or any website
6. The left-side toggle toolbar will appear on that page

## Recommended Workflow

1. Keep the extension in `Browse` mode when you want to click the website normally
2. Switch to `Draw` mode only when you want to mark up the page
3. Pick a tool and draw on the page
4. Switch back to `Browse` mode to continue using the website

## Controls

- `Browse` mode: website remains clickable
- `Draw` mode: overlay captures mouse input for drawing
- `Esc`: quick toggle between `Browse` and `Draw`
- `Ctrl+Z` / `Cmd+Z`: undo
- `Ctrl+Y`, `Cmd+Y`, or `Cmd+Shift+Z`: redo
- `Delete`: remove selected object

## Notes

- Drawings are saved per page path in `localStorage`
- Select the `extension` folder only, not the full project root

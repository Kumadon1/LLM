# How to Launch James LLM Desktop App

## Quick Launch (Easiest)

### Option 1: Double-click from Finder
1. Open Finder
2. Navigate to the `james-llm-1` folder
3. Double-click `Launch James LLM.command`
4. The app will open automatically

### Option 2: From Terminal
```bash
cd ~/james-llm-1
./launch.sh
```

## What happens when you launch:

1. **Cleanup**: Any existing processes are stopped
2. **Backend starts**: Python server launches (port 8000)
3. **Frontend starts**: React dev server launches (port 5173 or 5174)
4. **Desktop app opens**: Electron window appears with the full interface

## To stop the app:
- Close the Electron window, OR
- Press `Ctrl+C` in the terminal

## Troubleshooting:

### If the app doesn't launch:
1. Make sure dependencies are installed:
   ```bash
   cd ~/james-llm-1
   npm install --legacy-peer-deps
   cd frontend
   npm install --legacy-peer-deps
   cd ../backend
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Try launching manually:
   ```bash
   cd ~/james-llm-1
   ./launch.sh
   ```

### If you see a white screen:
- Wait a few seconds for the servers to start
- Try refreshing the window (Cmd+R)

### View the Add Text page:
1. Once the app opens, click on the "Add Text" tab
2. You'll see the Markov Chain Letter Sequence Generator interface

## Features in Add Text page:
- Import text from files
- Configure training parameters
- Process text for model training
- View training statistics
- Update and train the model

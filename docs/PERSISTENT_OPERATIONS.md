# Persistent Operations Architecture

## Overview
This Electron app implements a **persistent background operations architecture** that ensures long-running processes continue regardless of UI navigation. This is crucial for an educational language model app where users need to explore different features while operations like training or Monte Carlo simulations run in the background.

## Core Principle
**Operations never stop when switching tabs.** All long-running operations are managed by global Zustand stores that persist beyond component lifecycles.

## Architecture Components

### 1. Polling Manager (`frontend/src/store/polling.ts`)
- Centralized management of all polling intervals
- Prevents duplicate intervals for the same job
- Automatic cleanup when operations complete
- Singleton pattern ensures only one interval per job ID

### 2. Training Store (`frontend/src/store/trainingStore.ts`)
**Purpose**: Manages neural network training jobs globally

**Features**:
- Training continues when navigating away from AddText tab
- Progress persists in localStorage
- Pause/resume capabilities
- Auto-resume on app reload if job was running

**Key Methods**:
- `start()`: Begin training with text and parameters
- `stop()`: Pause training (can resume later)
- `resume()`: Continue a paused training job
- `clear()`: Stop and clear all training data

### 3. Monte Carlo Store (`frontend/src/store/monteCarloStore.ts`)
**Purpose**: Manages Monte Carlo simulations independently

**Features**:
- Simulations run in background across tab switches
- Results accumulate across sessions
- Can pause mid-simulation and resume later
- Historical results persist in localStorage

**Key Methods**:
- `start()`: Begin simulation with parameters
- `pause()`: Pause at current simulation number
- `resume()`: Continue from where paused
- `stop()`: Completely stop simulation
- `clear()`: Clear all results

### 4. Generation Store (`frontend/src/store/generationStore.ts`)
**Purpose**: Manages text generation operations

**Features**:
- Generation history persisted (last 50)
- Statistics calculated for each generation
- Can generate while other operations run

**Key Methods**:
- `generate()`: Generate text with parameters
- `clearHistory()`: Clear generation history
- `removeFromHistory()`: Remove specific generation

### 5. Global Status Bar (`frontend/src/components/GlobalStatusBar.tsx`)
**Purpose**: Floating UI showing all active operations

**Features**:
- Shows real-time progress for all operations
- Pause/resume/stop controls per operation
- Click to navigate to originating tab
- Auto-hides when no operations active
- Positioned bottom-right for visibility

## Usage Examples

### Starting Multiple Operations
```javascript
// User can start these simultaneously:
1. Start training a model in AddText tab
2. Switch to Monte Carlo tab and start simulation
3. Switch to Generate tab and generate text
// All three continue running!
```

### Resuming After Reload
```javascript
// If browser/app reloads:
1. Training automatically resumes if was running
2. Monte Carlo state restored (can manually resume)
3. Generation history preserved
```

### Monitoring Progress
- Floating status bar shows all active operations
- Click any operation to jump to its tab
- Pause/resume without losing progress

## Educational Benefits

1. **Exploration Without Interruption**: Students can explore different model features while training runs
2. **Comparative Analysis**: Run Monte Carlo while generating text to compare results
3. **No Lost Work**: Accidental tab switches don't lose progress
4. **Visual Learning**: See all operations at once via status bar
5. **Experiment Freely**: Pause, resume, and manage multiple experiments

## Technical Implementation

### State Persistence
- Job IDs stored in localStorage
- Results/history persisted for recovery
- Auto-resume logic on store initialization

### Memory Management
- Polling intervals properly cleaned up
- Maximum history limits (e.g., 50 generations)
- Results pruned to prevent memory bloat

### Concurrent Operations
- Each store manages its own operation independently
- No blocking between different operation types
- Shared polling manager prevents resource waste

## Developer Notes

### Adding New Operations
1. Create a new store in `frontend/src/store/`
2. Use `pollingManager` for any polling needs
3. Add status to `GlobalStatusBar`
4. Persist state in localStorage if needed

### Testing Persistence
1. Start an operation
2. Navigate to different tab
3. Check network tab - polling should continue
4. Refresh browser - operation should resume

### Performance Considerations
- Polling intervals: 2000ms default (adjustable)
- Max concurrent operations: No hard limit, but UI shows warnings
- localStorage limits: ~10MB typical (monitor usage)

## Troubleshooting

### Operation Not Persisting
- Check localStorage keys are being set
- Verify store's `resume()` is called on init
- Check polling manager has active interval

### Multiple Intervals Running
- Ensure using singleton polling manager
- Check job IDs are unique
- Verify cleanup on operation complete

### UI Not Updating
- Verify component subscribes to store
- Check store actions call `set()` properly
- Ensure derived state updates trigger re-renders

## Future Enhancements
- [ ] Add operation queuing system
- [ ] Implement operation priorities
- [ ] Add estimated time remaining
- [ ] Create operation history viewer
- [ ] Add notification system for completions
- [ ] Implement operation chaining/dependencies

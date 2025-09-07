# James LLM 1 - Setup and Usage Guide

## Overview
James LLM 1 is a character-level language model with both Markov chain and neural network components. The system features persistent training data storage that accumulates across sessions for continuous learning.

## Key Features
- **Persistent Training Data**: All training text is saved to a SQLite database
- **Cumulative Learning**: Each training session builds on previous data
- **Dual Model Architecture**: Markov chains + Neural network (CNN-BiLSTM-Attention)
- **Model Checkpointing**: Save and resume training from checkpoints
- **Training Statistics**: Track corpus size, model performance, and training history

## Prerequisites
- Python 3.11+
- Node.js 18+
- macOS/Linux (Windows with WSL)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd james-llm-1
```

### 2. Set Up Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 3. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Run Database Migrations
```bash
python3 migrate_database.py
```

## Running the Application

### Option 1: Using the Start Script (Recommended)
```bash
./start.sh
```
This will:
1. Run database migrations
2. Start the backend server on http://localhost:8000
3. Start the frontend dev server on http://localhost:5173

### Option 2: Manual Start

#### Terminal 1 - Backend
```bash
source .venv/bin/activate
python3 -m backend.app
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## Using the Application

### 1. Access the Web Interface
Open your browser and navigate to: http://localhost:5173

### 2. Training the Model
1. Go to the "Add Text" page
2. Enter or import training text
3. Click "Update Model"
4. Monitor training progress

**Important**: Training data persists across sessions and accumulates. Each new training session adds to the existing corpus.

### 3. Generating Text
1. Go to the "Generate" page
2. Enter a prompt (optional)
3. Select generation method (Markov, Neural, or Combined)
4. Click "Generate"

### 4. View Training Statistics
The API provides comprehensive statistics at: http://localhost:8000/api/training/stats

## API Documentation
Interactive API documentation is available at: http://localhost:8000/docs

### Key Endpoints
- `POST /api/train` - Start training with new text
- `GET /api/train/{job_id}` - Get training progress
- `POST /api/generate` - Generate text
- `GET /api/training/stats` - Get training statistics
- `GET /api/neural/configs` - List neural configurations

## Database Schema

### Main Tables
- **text_corpus**: Stores all training text
- **neural_checkpoints**: Model checkpoints
- **markov_ngrams**: N-gram frequencies
- **generation_history**: Generated text history
- **accuracy_metrics**: Model performance metrics

## Troubleshooting

### Database Issues
If you encounter database errors:
```bash
# Run migrations
python3 migrate_database.py

# Or reset database (WARNING: Loses all data)
rm james_llm.db
python3 -c "from backend.db.engine import init_db; init_db()"
python3 migrate_database.py
```

### Port Conflicts
If ports are already in use:
- Backend: Change port in `backend/app.py` or use `PORT=8001 python3 -m backend.app`
- Frontend: Change port in `frontend/vite.config.ts`

### Module Import Errors
Ensure virtual environment is activated:
```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## Architecture

### Backend (FastAPI + SQLAlchemy)
- **API Layer**: FastAPI routes in `backend/api/routes/`
- **Services**: Business logic in `backend/services/`
- **Database**: SQLAlchemy ORM with repository pattern
- **Models**: Neural network (PyTorch) and Markov chains

### Frontend (React + TypeScript + Vite)
- **UI Components**: Material-UI components
- **API Client**: Centralized API service layer
- **State Management**: React hooks
- **Build Tool**: Vite for fast development

### Database
- **SQLite**: Default database (can be configured for PostgreSQL/MySQL)
- **Connection Pooling**: Efficient connection management
- **Migrations**: Schema versioning and evolution

## Development

### Running Tests
```bash
# Backend tests
pytest backend/tests/

# Frontend tests
cd frontend && npm test
```

### Building for Production
```bash
# Build frontend
cd frontend && npm run build

# Package backend
cd .. && pyinstaller backend.spec
```

## Environment Variables

Create a `.env` file in the root directory:
```env
# Database
DB_TYPE=sqlite
DATABASE_PATH=james_llm.db

# API
PORT=8000
HOST=0.0.0.0

# Frontend
VITE_API_URL=http://localhost:8000
```

## Performance Tips

1. **Training Block Size**: Adjust `block_size` parameter based on your system's memory
2. **Batch Size**: Lower batch size if running out of GPU/CPU memory
3. **Epochs**: Start with fewer epochs (3-5) for initial training
4. **Database Optimization**: Run `VACUUM` periodically on SQLite database

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License
[Your License Here]

## Support
For issues or questions, please open an issue on GitHub or contact the maintainers.

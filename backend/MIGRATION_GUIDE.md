# Backend Migration Guide: Monolithic to Modular

## Overview
This guide helps you migrate from the monolithic `app.py` to the new modular structure.

## Files Created in Phase 2

### Directory Structure
```
backend/
├── api/
│   ├── dependencies.py       # Shared dependencies
│   └── routes/
│       ├── training.py       # Training endpoints
│       ├── generation.py     # Generation endpoints
│       ├── neural.py         # Neural config endpoints
│       └── models.py         # Model management endpoints
├── schemas/
│   ├── neural.py            # Neural configuration schemas
│   ├── training.py          # Training schemas
│   ├── generation.py        # Generation schemas
│   └── models.py            # Model schemas
├── db/
│   └── repository.py        # Database repository pattern
├── utils/
│   └── word_validation.py   # Word validation utilities
└── app_modular.py          # New modular app entry point
```

## Migration Steps

### Step 1: Test the New Structure
```bash
# Test the new modular backend
cd /Users/james/james-llm-1/backend
python app_modular.py
```

### Step 2: Verify API Endpoints
Visit http://localhost:8000/docs to verify all endpoints are working.

### Step 3: Update Frontend Configuration (if needed)
The API endpoints remain the same, so no frontend changes are required.

### Step 4: Switch to New Backend
```bash
# Backup the old app.py
cp app.py app_monolithic_backup.py

# Use the new modular app
cp app_modular.py app.py
```

### Step 5: Update Startup Scripts
Update any startup scripts to use the new app.py:
- No changes needed if scripts already use `app.py`
- The new structure is backward compatible

## Benefits of Modular Structure

### Before (Monolithic):
- Single 508-line `app.py` file
- Mixed concerns (routes, schemas, database, utilities)
- Difficult to test individual components
- Hard to maintain and extend

### After (Modular):
- **Organized structure**: Clear separation of concerns
- **Smaller files**: No file over 200 lines
- **Reusable components**: Repository pattern, schemas, utilities
- **Better testing**: Each module can be tested independently
- **Easier maintenance**: Changes isolated to specific modules
- **Type safety**: Pydantic schemas with validation

## API Compatibility

All API endpoints remain the same:

### Training
- `POST /api/train` - Start training
- `GET /api/train/{job_id}` - Get progress
- `POST /api/text` - Add text
- `GET /api/text` - Get texts
- `DELETE /api/text/{id}` - Delete text
- `GET /api/data/stats` - Get statistics
- `POST /api/corpus/ingest` - Ingest corpus
- `GET /api/corpus/status` - Corpus status

### Generation
- `POST /api/generate` - Generate text
- `GET /api/generate/history` - Get history
- `DELETE /api/generate/history` - Clear history
- `POST /api/monte-carlo/run` - Run simulation
- `POST /api/accuracy/record` - Record metric
- `GET /api/accuracy/metrics` - Get metrics

### Neural Configuration
- `POST /api/neural-config` - Save config
- `GET /api/neural-config` - Get configs
- `PUT /api/neural-config/{id}` - Update config
- `DELETE /api/neural-config/{id}` - Delete config

### Models
- `GET /api/models` - List models
- `POST /api/models/download` - Download model
- `DELETE /api/models/{name}` - Delete model

## Database Compatibility

The database structure remains unchanged:
- Same SQLite database file
- Same table schemas
- No data migration required

## Rollback Plan

If you need to rollback:
```bash
# Restore the original app.py
cp app_monolithic_backup.py app.py
```

## Testing Checklist

- [ ] Backend starts without errors
- [ ] All API endpoints accessible in /docs
- [ ] Training job can be started
- [ ] Text generation works
- [ ] Neural configs can be saved/loaded
- [ ] Database operations work correctly
- [ ] Frontend can communicate with backend

## Troubleshooting

### Import Errors
Make sure you're in the backend directory and the project root is in the Python path.

### Database Connection Issues
The new structure uses the same database file. Check that `james_llm.db` exists.

### Missing Dependencies
The new structure uses the same dependencies. No new packages required.

## Next Steps

After successful migration:
1. Delete `app_monolithic_backup.py` once confirmed working
2. Update any documentation to reference new structure
3. Consider adding unit tests for new modules
4. Set up CI/CD with the modular structure

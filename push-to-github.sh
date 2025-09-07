#!/bin/bash

# Push to GitHub script
# Replace the URL below with your actual GitHub repository URL

echo "Setting up GitHub remote..."

# Add your GitHub repository as origin
git remote add origin https://github.com/Kumadon1/LLM.git

# Push the code
echo "Pushing to GitHub..."
git push -u origin main

echo "Done! Your code is now on GitHub."

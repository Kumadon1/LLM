#!/usr/bin/env python3
"""
Test script to verify Monte Carlo generation and PyEnchant validation
"""

import requests
import json
import time

# API endpoint
API_URL = "http://localhost:5001/api/generate"

def test_single_generation():
    """Test a single generation to see the response format"""
    print("Testing single generation...")
    
    response = requests.post(API_URL, json={
        "temperature": 1.0,
        "max_tokens": 100
    })
    
    if response.status_code == 200:
        data = response.json()
        text = data.get("generated_text", "")
        valid_mask = data.get("valid_mask", [])
        
        words = text.split()
        valid_count = sum(valid_mask)
        total_words = len(valid_mask)
        
        print(f"Generated text: {text[:100]}...")
        print(f"Words generated: {len(words)}")
        print(f"Valid mask length: {total_words}")
        print(f"Valid words: {valid_count}/{total_words}")
        if total_words > 0:
            print(f"Valid percentage: {(valid_count/total_words)*100:.1f}%")
        
        # Show word-by-word validation
        print("\nWord validation details:")
        for i, (word, valid) in enumerate(zip(words[:10], valid_mask[:10])):
            status = "✓" if valid else "✗"
            print(f"  {status} {word}")
        
        return True
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return False

def test_monte_carlo_simulation(num_runs=10):
    """Run a mini Monte Carlo simulation"""
    print(f"\n\nRunning Monte Carlo simulation with {num_runs} runs...")
    
    results = []
    for i in range(num_runs):
        print(f"Run {i+1}/{num_runs}...", end=" ")
        
        response = requests.post(API_URL, json={
            "temperature": 1.0,
            "max_tokens": 50
        })
        
        if response.status_code == 200:
            data = response.json()
            valid_mask = data.get("valid_mask", [])
            valid_count = sum(valid_mask)
            total_words = len(valid_mask)
            
            if total_words > 0:
                valid_percentage = (valid_count / total_words) * 100
                results.append(valid_percentage)
                print(f"{valid_percentage:.1f}% valid")
            else:
                print("No words generated")
        else:
            print(f"Error: {response.status_code}")
        
        time.sleep(0.1)  # Small delay between requests
    
    if results:
        print(f"\n\nResults Summary:")
        print(f"  Mean: {sum(results)/len(results):.1f}%")
        print(f"  Min: {min(results):.1f}%")
        print(f"  Max: {max(results):.1f}%")
        
        # Create simple histogram
        print("\nHistogram (10% bins):")
        bins = {}
        for r in results:
            bin_idx = int(r // 10) * 10
            bins[bin_idx] = bins.get(bin_idx, 0) + 1
        
        for i in range(0, 100, 10):
            count = bins.get(i, 0)
            bar = "█" * count
            print(f"  {i:3d}-{i+9:3d}%: {bar} ({count})")

if __name__ == "__main__":
    print("Monte Carlo Test Script")
    print("=" * 50)
    
    if test_single_generation():
        test_monte_carlo_simulation(20)
    else:
        print("Single generation test failed. Check if backend is running.")

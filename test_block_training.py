#!/usr/bin/env python3
"""
Test script to verify block-by-block training works correctly
"""
import sys
import os

# Set the backend path and database path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)

# Set the database path to use the backend database
os.environ['DATABASE_PATH'] = os.path.join(backend_path, 'james_llm.db')

from services.training_service import train_with_persistence

def test_block_training():
    """Test that training processes text block by block"""
    
    # Create test text that will be split into multiple blocks
    # Using a block size of 1000 characters for testing
    test_text = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG " * 100  # ~4500 characters
    
    print(f"Test text length: {len(test_text)} characters")
    print("Testing with block_size=1000, epochs=2")
    print("-" * 50)
    
    def progress_callback(progress, message):
        print(f"[{progress:3d}%] {message}")
    
    try:
        checkpoint_path, stats = train_with_persistence(
            text=test_text,
            block_size=1000,  # Small blocks for testing
            epochs=2,  # 2 epochs per block
            batch_size=16,
            learning_rate=1e-3,
            progress_callback=progress_callback
        )
        
        print("\n" + "=" * 50)
        print("Training completed successfully!")
        print(f"Checkpoint saved to: {checkpoint_path}")
        print("\nTraining Statistics:")
        print(f"  Total blocks processed: {stats['total_blocks']}")
        print(f"  Epochs per block: {stats['epochs_per_block']}")
        print(f"  Total training steps: {stats['total_steps']}")
        print(f"  Final loss: {stats['final_loss']:.4f}")
        print(f"  Device used: {stats['device']}")
        
        if 'block_losses' in stats:
            print(f"\nBlock losses: {[f'{loss:.4f}' for loss in stats['block_losses']]}")
        
        # Verify that we processed the expected number of blocks
        expected_blocks = (len(test_text) + 999) // 1000  # Ceiling division
        assert stats['total_blocks'] == expected_blocks, f"Expected {expected_blocks} blocks, got {stats['total_blocks']}"
        print(f"\n✓ Verified: Processed {expected_blocks} blocks as expected")
        
        # Verify that model was trained (loss should be reasonable)
        assert stats['final_loss'] > 0, "Loss should be positive"
        assert stats['total_steps'] > 0, "Should have taken some training steps"
        print("✓ Verified: Model training occurred")
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    print("Testing Block-by-Block Training Implementation")
    print("=" * 50)
    success = test_block_training()
    sys.exit(0 if success else 1)

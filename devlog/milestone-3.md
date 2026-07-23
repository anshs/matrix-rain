# Devlog: Milestone 3 - The Infinite Matrix

*Date: July 2026*

In Milestone 2, we successfully transitioned our 2D code rain into a true 3D space using `THREE.InstancedMesh`. It looked spectacular, but it had one massive limitation: you couldn't really *move* through it. The camera was stuck sweeping back and forth over a static, finite diorama of characters. 

For Milestone 3, the goal was simple but technically challenging: **Allow the user to fly anywhere in the Matrix, freely and infinitely.**

## The Problem with Milestone 2

In the M2 architecture, we created a massive block of instanced cells right at the origin `(0, 0, 0)`. We calculated how big the camera's view was at its furthest point, and built a 3D grid large enough to fill that view. 

If we just unlocked the camera and allowed the user to fly forward (like a First-Person Shooter), two things would happen:
1. You would fly past the trails, eventually exiting the "cube" of code and staring into empty space.
2. If we simply made the static cube larger (e.g., millions and millions of instances) to allow for more roaming, the GPU would melt. WebGL vertex shaders are fast, but running millions of matrices every frame is a memory and processing nightmare.

We needed a way to make the matrix feel infinite without actually rendering an infinite number of cells.

## For Beginners: What is a "Sparse Instance Pool"?

Imagine you want to simulate an entire ocean, but your computer can only render a small swimming pool's worth of water before it crashes. 

*   **The Dense Grid Approach (Milestone 2):** You build the entire ocean, drop by drop, but you paint the drops you can't see completely transparent. Even though they are invisible, your GPU still has to process them every single frame. If the ocean is 1,000,000 drops, the GPU does 1,000,000 math equations. 
*   **The Sparse Instance Pool Approach (Milestone 3):** You only create exactly as many drops as you need to simulate the water immediately around you. As you swim forward, you take the drops that fall behind you and instantly teleport them in front of you. 

### The Math

Let's look at the memory and performance difference:

**Dense Grid (M2):**
If we build a grid that is 100 cells wide, 100 cells high, and 100 cells deep:
*   `100 x 100 x 100 = 1,000,000` total cells.
*   Each cell requires a 3D transformation matrix (16 numbers) to tell the GPU where it is. 
*   `1,000,000 x 16 floats x 4 bytes = ~64 Megabytes` of data sent to the graphics card.
*   When moving fast, updating these matrices can drop the frame rate from 144 FPS down to a choppy 10 FPS.

**Sparse Instance Pool (M3):**
Instead of a giant block, we only track the **active characters** currently falling in our matrix trails. If we have 500 trails, and each trail is 30 characters long:
*   `500 x 30 = 15,000` active cells.
*   `15,000 x 16 floats x 4 bytes = ~0.9 Megabytes` of data.
*   This is a **98.5% reduction** in memory and processing overhead. The game easily stays locked at 144+ FPS because the GPU is doing almost zero unnecessary work!

## The Solution: Sparse Instance Pool

The solution was to invert the relationship between the camera and the grid. Instead of placing the camera *inside* a giant static grid of empty cells, we completely eliminate empty cells. We use a **Sparse Instance Pool**.

Here is a breakdown of the differences between M2 and M3 logic:

### 1. Dense Grid vs Sparse Pool
*   **M2**: We built a large static mesh of up to millions of cells. In the update loop, we updated an array representing this massive space, turning cells "on" or "off" based on the trails.
*   **M3**: We only allocate exactly enough instances in the `InstancedMesh` for the active characters in the trails (around 15,000 maximum). We completely eliminated the "empty space" matrix data.

### 2. The InstancedMesh Matrices
*   **M2**: The `dummy` matrix for every single cell was calculated once at initialization and never changed.
*   **M3**: Every frame, we loop over the active trails and push matrix updates *only* for those 15,000 characters. To maintain the illusion of a perfect grid, we mathematically snap the trail coordinates to an invisible world grid `(Math.round(pos / SIZE) * SIZE)`. This requires far less memory and CPU/GPU bandwidth than managing a sliding AABB of empty space.

### 3. Stable Characters via Spatial Hashing
*   **M2**: We assigned a random character index to each 1D array slot in the grid (`charIndices[idx] = random`).
*   **M3**: Because we don't have a massive grid array to store state in, we implemented a **3D Spatial Hash function**. The character index is deterministically generated mathematically from the absolute world coordinate `(x, y, z)`. A cell at `(10, 50, -20)` will always yield the exact same character, no matter how the camera moves, preventing flickering.

### 4. Infinite Trails
*   **M2**: Trails spawned at the top of the static grid and fell to the bottom.
*   **M3**: Trails spawn in the world relative to the camera's moving grid. If a trail falls way below the camera, or gets left behind as you fly horizontally, it is instantly respawned ahead of your flight path.

## The Result

The result is a hyper-optimized, buttery smooth 6-DOF (Degrees of Freedom) flight experience. You can use WASD and the mouse to navigate freely in any direction, flying indefinitely through an endless ocean of Matrix code, while the engine technically only draws the small pocket of space you are currently looking at.

*Welcome to the real world.*

# Boids flocking

Boids simulation made with three.js

The simulation uses a spatial hash grid to optimise each Boid's nearest neighbours checks, to avoid looping over every single boid each time (O(N^2)).
You can toggle on and off the debug of the spatial hash grid to see how the nearest neighbour optimization works.

See it here: https://jtsorlinis.github.io/BoidsThree/

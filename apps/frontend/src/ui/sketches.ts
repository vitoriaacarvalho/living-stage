import arabesque from '../assets/sketches/arabesque.webp';
import cambre from '../assets/sketches/cambre.webp';
import pointe from '../assets/sketches/pointe-shoes.webp';
import reverence from '../assets/sketches/reverence.webp';

export const sketches = { arabesque, cambre, pointe, reverence };

export type Sketch = keyof typeof sketches;

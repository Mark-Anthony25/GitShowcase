import { getStarCountLabel } from '../projectStats';

if (getStarCountLabel({ stars: 42 }) !== '42') {
  throw new Error('A known GitHub star count must remain visible.');
}

if (getStarCountLabel(undefined) !== 'Not available') {
  throw new Error('Missing GitHub metadata must not render an ellipsis placeholder.');
}

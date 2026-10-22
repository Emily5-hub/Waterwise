import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
afterEach(() => { cleanup(); localStorage.clear(); });
window.scrollTo = () => {}; // jsdom doesn't implement scrolling

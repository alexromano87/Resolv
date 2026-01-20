import { render, screen } from '@testing-library/react';
import Logo from './Logo';

describe('Logo', () => {
  it('renders horizontal logo variant', () => {
    render(<Logo variant="horizontal" size="md" />);
    const img = screen.getByAltText('RESOLV') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('/logo-horizontal.svg');
  });

  it('renders color logo by default', () => {
    render(<Logo />);
    const img = screen.getByAltText('RESOLV') as HTMLImageElement;
    expect(img.src).toContain('/logo_resolv.png');
  });
});

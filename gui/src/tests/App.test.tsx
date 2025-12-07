import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { TwitchProvider } from '../utils/TwitchContext';
import { PredictionsProvider } from '../utils/PredictionsContext';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <TwitchProvider>
        <PredictionsProvider>
          {component}
        </PredictionsProvider>
      </TwitchProvider>
    </BrowserRouter>
  );
};

describe('App', () => {
  it('renders without crashing', () => {
    renderWithProviders(<App />);
    expect(document.body).toBeTruthy();
  });

  it('renders router correctly', () => {
    const { container } = renderWithProviders(<App />);
    expect(container).toBeInTheDocument();
  });
});

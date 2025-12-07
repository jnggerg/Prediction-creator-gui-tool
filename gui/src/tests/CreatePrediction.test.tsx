import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreatePrediction from '../components/CreatePrediction';
import { TwitchProvider } from '../utils/TwitchContext';
import { PredictionsProvider } from '../utils/PredictionsContext';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

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

describe('CreatePrediction Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create prediction form', () => {
    renderWithProviders(<CreatePrediction />);
    
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /options/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /prediction window/i })).toBeInTheDocument();
  });

  it('displays error when title is too short', async () => {
    renderWithProviders(<CreatePrediction />);
    
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    const saveButton = screen.getByRole('button', { name: /save/i });

    fireEvent.change(titleInput, { target: { value: 'AB' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/title must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('displays error when less than 2 outcomes provided', async () => {
    renderWithProviders(<CreatePrediction />);
    
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    const outcomesInput = screen.getByRole('textbox', { name: /options/i });
    const saveButton = screen.getByRole('button', { name: /save/i });

    fireEvent.change(titleInput, { target: { value: 'Test Prediction' } });
    fireEvent.change(outcomesInput, { target: { value: 'Option 1' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/at least two unique outcomes/i)).toBeInTheDocument();
    });
  });

  it('displays error when prediction window is out of range', async () => {
    renderWithProviders(<CreatePrediction />);
    
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    const outcomesInput = screen.getByRole('textbox', { name: /options/i });
    const windowInput = screen.getByRole('textbox', { name: /prediction window/i });
    const saveButton = screen.getByRole('button', { name: /save/i });

    fireEvent.change(titleInput, { target: { value: 'Test Prediction' } });
    fireEvent.change(outcomesInput, { target: { value: 'Yes, No' } });
    fireEvent.change(windowInput, { target: { value: '20' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/between 30 and 1800 seconds/i)).toBeInTheDocument();
    });
  });

  it('displays error when outcome is too long', async () => {
    renderWithProviders(<CreatePrediction />);
    
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    const outcomesInput = screen.getByRole('textbox', { name: /options/i });
    const saveButton = screen.getByRole('button', { name: /save/i });

    fireEvent.change(titleInput, { target: { value: 'Test Prediction' } });
    fireEvent.change(outcomesInput, { 
      target: { value: 'This is a very long outcome that exceeds twenty five characters, No' } 
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/must be less than 25 characters/i)).toBeInTheDocument();
    });
  });

  it('allows valid form input', () => {
    renderWithProviders(<CreatePrediction />);
    
    const titleInput = screen.getByRole('textbox', { name: /title/i }) as HTMLInputElement;
    const outcomesInput = screen.getByRole('textbox', { name: /options/i }) as HTMLInputElement;
    const windowInput = screen.getByRole('textbox', { name: /prediction window/i }) as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: 'Will it rain?' } });
    fireEvent.change(outcomesInput, { target: { value: 'Yes, No' } });
    fireEvent.change(windowInput, { target: { value: '120' } });

    expect(titleInput.value).toBe('Will it rain?');
    expect(outcomesInput.value).toBe('Yes, No');
    expect(windowInput.value).toBe('120');
  });

  it('has a back button', () => {
    renderWithProviders(<CreatePrediction />);
    
    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
  });
});

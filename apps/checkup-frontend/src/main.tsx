import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { StudioProvider } from './contexts/StudioContext';
import { PreassessmentNavProvider } from './contexts/PreassessmentNavContext';

document.addEventListener(
  'submit',
  (event) => {
    const form = event.target;
    if (form instanceof HTMLFormElement) {
      form.classList.add('form-submitted');
    }
  },
  true,
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudioProvider>
          <PreassessmentNavProvider>
            <App />
          </PreassessmentNavProvider>
        </StudioProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

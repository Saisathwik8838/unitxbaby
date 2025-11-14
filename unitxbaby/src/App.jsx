import { BrowserRouter } from 'react-router-dom';
import { ReduxProvider } from './store/ReduxProvider';
import LandingPage from './components/LandingPage';

function App() {
  return (
    <BrowserRouter>
      <ReduxProvider>
        <LandingPage />
      </ReduxProvider>
    </BrowserRouter>
  );
}

export default App;

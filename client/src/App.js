import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import PageRouter from './PageRouter';
import routes from './routes';
import NavBar from './component/layout/navbar/NavBar'

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <div className="mb-3">
          <NavBar links={routes} />
        </div>
        <PageRouter routes={routes} />
      </div>
    </BrowserRouter>
  );
}

export default App;
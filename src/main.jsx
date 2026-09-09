import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import '@mantine/core/styles.css';
import './print.css';
import './autoValue.css';
import App from './App';
import { labTheme } from './theme';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'mantine-color-scheme' });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={labTheme} colorSchemeManager={colorSchemeManager} defaultColorScheme="light">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
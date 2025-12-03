import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Amplify } from 'aws-amplify';
import App from './App'
import './index.css'

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: 'us-east-1_My9slvWw1',
            userPoolClientId: '39fct9u2g3v7njis4bbvcm6h4h',
        }
    }
});

ReactDOM.createRoot(document.getElementById('app')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './App.css'

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found")
}

try {
  const root = createRoot(rootElement)
  root.render(<App />)
} catch (error) {
  console.error("Error rendering app:", error)
}

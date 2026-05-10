import { BrowserRouter } from 'react-router-dom'

import { Providers } from './app/providers'
import { AppRoutes } from './app/routes'

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Providers>
  )
}

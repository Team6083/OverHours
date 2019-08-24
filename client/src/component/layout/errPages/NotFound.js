import React from 'react'
import ErrorPage from './ErrorPage'

export default function NotFound() {
    return (
        <div>
            <ErrorPage errCode={404} />
        </div>
    )
}

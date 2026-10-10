import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getStatus, sendMessage } from './api'
vi.mock('./api', () => ({ getStatus: vi.fn(), sendMessage: vi.fn() }))
const status = {status: 'ready', mode: 'mock', platform_target: 'macOS', languages: ['en', 'sr'], capabilities: {chat: true, voice: false, memory: false, automation: false}}
beforeEach(() => { vi.mocked(getStatus).mockResolvedValue(status); vi.mocked(sendMessage).mockResolvedValue({reply: 'Mock reply', mode: 'mock'}) })
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('dashboard', () => {
  it('shows real status and sends a chat request', async () => {
    render(<App />)
    await screen.findByText('Online')
    fireEvent.change(screen.getByLabelText('Message'), {target: {value: 'Hello'}})
    fireEvent.click(screen.getByLabelText('Send message'))
    await screen.findByText('Mock reply')
    expect(sendMessage).toHaveBeenCalledWith('Hello', 'en')
    expect(screen.getByText('Mock response ·', {exact: false})).toBeInTheDocument()
  })
  it('switches Serbian language and keeps microphone a placeholder', async () => {
    render(<App />)
    await screen.findByText('Online')
    fireEvent.change(screen.getByLabelText('Language'), {target: {value: 'sr'}})
    expect(screen.getByText('Na vašoj usluzi.')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Microphone — coming soon'))
    expect(screen.getByText(/Pristup mikrofonu nije zatražen/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Message'), {target: {value: 'Zdravo'}})
    fireEvent.click(screen.getByLabelText('Pošalji poruku'))
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith('Zdravo', 'sr'))
  })
  it('shows an offline error and disables sending', async () => {
    vi.mocked(getStatus).mockRejectedValue(new Error('offline'))
    render(<App />)
    await screen.findByText('Offline')
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable')
    fireEvent.change(screen.getByLabelText('Message'), {target: {value: 'Hello'}})
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })
  it('records failed requests without a fake success', async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error('failed'))
    render(<App />)
    await screen.findByText('Online')
    fireEvent.change(screen.getByLabelText('Message'), {target: {value: 'Hello'}})
    fireEvent.click(screen.getByLabelText('Send message'))
    await screen.findByText(/Request failed/)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

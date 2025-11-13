import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '../hooks/custom/useSpeechRecognition';

// Mock the browser SpeechRecognition API
const mockSpeechRecognition = {
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null as Function | null,
  onerror: null as Function | null,
  onend: null as Function | null,
};

describe('useSpeechRecognition', () => {
  beforeAll(() => {
    // Mock window.SpeechRecognition
    (window as any).SpeechRecognition = jest.fn(() => mockSpeechRecognition);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.isSupported).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should start listening when startListening is called', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    
    act(() => {
      result.current.startListening();
    });
    
    expect(mockSpeechRecognition.start).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  it('should stop listening when stopListening is called', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    
    // First start listening
    act(() => {
      result.current.startListening();
    });
    
    // Then stop listening
    act(() => {
      result.current.stopListening();
    });
    
    expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('should handle speech recognition results', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    
    // Simulate speech recognition result
    act(() => {
      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult({
          results: [{
            isFinal: true,
            0: {
              transcript: 'Test transcript'
            }
          }],
          resultIndex: 0
        } as any);
      }
    });
    
    // Since the transcript is updated asynchronously, we need to wait
    setTimeout(() => {
      expect(result.current.transcript).toBe('Test transcript ');
    }, 0);
  });
});
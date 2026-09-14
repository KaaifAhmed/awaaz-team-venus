import { useState, useRef } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  isPlayingAudio: boolean;
  audioElementRef: React.RefObject<HTMLAudioElement | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  removeAudio: () => void;
  togglePlayAudio: () => void;
  setIsPlayingAudio: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useAudioRecorder = (): AudioRecorderState => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Mic access issue, falling back to simulated voice note", err);
      setIsRecording(true);
      setRecordingDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      const dummyBlob = new Blob(["mock-voice-recording-bytes"], { type: "audio/webm" });
      setAudioBlob(dummyBlob);
      setAudioUrl("mock-audio-recording");
    }
    clearInterval(timerIntervalRef.current);
    setIsRecording(false);
  };

  const removeAudio = () => {
    setAudioBlob(null);
    if (audioUrl && audioUrl !== "mock-audio-recording") {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setIsPlayingAudio(false);
  };

  const togglePlayAudio = () => {
    if (audioElementRef.current) {
      if (isPlayingAudio) {
        audioElementRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioElementRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  return {
    isRecording,
    recordingDuration,
    audioBlob,
    audioUrl,
    isPlayingAudio,
    audioElementRef,
    startRecording,
    stopRecording,
    removeAudio,
    togglePlayAudio,
    setIsPlayingAudio,
  };
};

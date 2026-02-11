import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export const useMicrophone = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsListening(false);
    }, []);

    const startRecording = useCallback(async (onStopCallback: (blob: Blob) => void) => {
        try {
            // Context check for IP-based access
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                if (!sessionStorage.getItem('insecure_mic_notified')) {
                    toast.info("Conexão por IP detectada. O navegador solicitará permissão a cada uso. Para permitir automaticamente, use localhost ou uma conexão segura (HTTPS).", {
                        duration: 5000,
                    });
                    sessionStorage.setItem('insecure_mic_notified', 'true');
                }
            }

            // Reuse existing stream if it's still active to avoid re-prompting on some browsers/contexts
            let stream = streamRef.current;
            if (!stream || !stream.active) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            }

            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                onStopCallback(blob);

                // On secure contexts, we should stop tracks to be polite.
                // On insecure contexts, keeping it active MIGHT prevent re-prompting, 
                // but it leaves the recording indicator active. 
                // We'll follow standard practice of stopping tracks for privacy.
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsListening(true);
            setRecordingTime(0);
            setTranscript(""); // Clear transcript for new recording

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }

                const rec = new SpeechRecognition();
                rec.continuous = true;
                rec.interimResults = true;
                rec.lang = "pt-BR";

                rec.onresult = (event: any) => {
                    let interim = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        interim += event.results[i][0].transcript;
                    }
                    setTranscript(interim);
                };

                rec.onerror = (event: any) => {
                    console.error("Speech Recognition Error:", event.error);
                };

                rec.start();
                recognitionRef.current = rec;
            }

        } catch (error) {
            console.error("Mic error:", error);
            const errorMessage = (error as any).name === 'NotAllowedError'
                ? "Permissão negada. Ative o microfone nas configurações do seu navegador."
                : "Erro ao acessar microfone.";
            toast.error(errorMessage);
            throw error;
        }
    }, []);

    return {
        isListening,
        transcript,
        setTranscript,
        recordingTime,
        setRecordingTime,
        startRecording,
        stopRecording
    };
};

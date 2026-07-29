import { toast as hotToast } from 'react-hot-toast';

export const playNotifySound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const audioCtx = new AudioContext();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // A pleasant generic notification bell sound
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.05); // A6

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (err) {
        console.log("Audio play blocked or not supported:", err);
    }
};

const toast = (msg, opts) => {
    playNotifySound();
    return hotToast(msg, opts);
};

toast.success = (msg, opts) => {
    playNotifySound();
    return hotToast.success(msg, opts);
};

toast.error = (msg, opts) => {
    playNotifySound();
    return hotToast.error(msg, opts);
};

toast.loading = (msg, opts) => {
    return hotToast.loading(msg, opts);
};

toast.dismiss = hotToast.dismiss;
toast.promise = hotToast.promise;
toast.custom = hotToast.custom;

export default toast;

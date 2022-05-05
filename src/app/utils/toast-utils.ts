import { Toast, ShowOptions } from '@capacitor/toast';

export const showToast = async (options: ShowOptions) => {
  const keys = Object.keys(options);
  const mMsg = keys.includes('text') && options.text.length > 0 ? options.text : 'No message given';
  const mDur = keys.includes('duration') && ['short','long'].includes(options.duration) ? options.duration : 'short';
  const mPos = keys.includes('position') && ['top','center','bottom'].includes(options.position) ? options.position : 'bottom';
  await Toast.show({
    text: mMsg,
    duration: mDur,
    position: mPos
  });
};

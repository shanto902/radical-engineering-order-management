import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToOrderDetail(orderId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('OrderDetail', { orderId });
  } else {
    // Retry when navigation container mounts (e.g. cold launch from push notification)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (navigationRef.isReady()) {
        clearInterval(interval);
        navigationRef.navigate('OrderDetail', { orderId });
      } else if (attempts > 40) {
        clearInterval(interval);
      }
    }, 100);
  }
}


import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToOrderDetail(orderId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('OrderDetail', { orderId });
  }
}


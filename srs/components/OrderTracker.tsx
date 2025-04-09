import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

type OrderStatus = 'pending' | 'accepted' | 'driver_assigned' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';

interface OrderTrackerProps {
  orderId: string;
}

interface OrderDetails {
  status: OrderStatus;
  driverName?: string;
  driverPhone?: string;
  estimatedArrival?: string;
  vehicleInfo?: {
    model: string;
    color: string;
    plateNumber: string;
  };
}

const statusSteps = [
  { status: 'pending', label: 'Заказ получен', icon: Clock },
  { status: 'accepted', label: 'Заказ принят', icon: CheckCircle },
  { status: 'driver_assigned', label: 'Водитель назначен', icon: CheckCircle },
  { status: 'on_the_way', label: 'В пути к вам', icon: CheckCircle },
  { status: 'arrived', label: 'Прибыл на место', icon: CheckCircle },
  { status: 'completed', label: 'Поездка завершена', icon: CheckCircle },
];

const OrderTracker: React.FC<OrderTrackerProps> = React.memo(({ orderId }) => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderStatus = useCallback(async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Используем API класс
      const api = new (window as any).API();
      const orderData = await api.getOrder(orderId);

      // Check if we're getting fallback data
      if (orderData.proxy_error) {
        setError('Сервер временно недоступен. Отображается предварительная информация.');
        setOrderDetails(orderData);
        return;
      }

      // Validate order status
      if (!statusSteps.some(step => step.status === orderData.status) &&
          orderData.status !== 'cancelled') {
        console.error('Invalid order status:', orderData.status);
        setError('Получен некорректный статус заказа');
        return;
      }
      
      setOrderDetails(orderData);
    } catch (error) {
      console.error('Error fetching order status:', error);
      setError('Не удалось получить информацию о заказе. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for updates every 30 seconds
  useEffect(() => {
    fetchOrderStatus(orderId);
    
    const intervalId = setInterval(() => {
      fetchOrderStatus(orderId);
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [orderId, fetchOrderStatus]);

  if (loading && !orderDetails) {
    return (
      <div className="p-6 rounded-2xl border-2 border-champagne/20 bg-pearl animate-pulse">
        <p className="text-center text-onyx/70">Загрузка информации о заказе...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl border-2 border-red-200 bg-red-50">
        <div className="flex items-center text-red-700 mb-2">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <h3 className="font-medium">Ошибка</h3>
        </div>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="p-6 rounded-2xl border-2 border-champagne/20 bg-pearl">
        <p className="text-center text-onyx/70">Информация о заказе не найдена</p>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(step => step.status === orderDetails.status);

  if (orderDetails.status === 'cancelled') {
    return (
      <div className="p-6 rounded-2xl border-2 border-red-200 bg-red-50">
        <div className="flex items-center text-red-700 mb-2">
          <XCircle className="w-5 h-5 mr-2" />
          <h3 className="font-medium">Заказ отменен</h3>
        </div>
        <p className="text-red-600">К сожалению, ваш заказ был отменен.</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border-2 border-champagne/20 bg-pearl">
      <h3 className="text-xl font-semibold mb-4">Отслеживание заказа #{orderId}</h3>
      
      {/* Progress steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <React.Fragment key={step.status}>
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-velvet text-pearl' 
                        : 'bg-champagne/20 text-onyx/40'
                    } ${
                      isCurrent ? 'ring-4 ring-velvet/20' : ''
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    isCompleted ? 'text-onyx font-medium' : 'text-onyx/40'
                  }`}>
                    {step.label}
                  </span>
                </div>
                
                {index < statusSteps.length - 1 && (
                  <div 
                    className={`flex-1 h-1 mx-2 ${
                      index < currentStepIndex ? 'bg-velvet' : 'bg-champagne/20'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Driver info */}
      {orderDetails.status !== 'pending' && orderDetails.status !== 'accepted' && (
        <div className="bg-pearl/80 p-4 rounded-xl border border-champagne/20 mb-4">
          <h4 className="font-medium mb-2">Информация о поездке</h4>
          
          {orderDetails.driverName && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-onyx/70">Водитель:</span>
              <span className="font-medium">{orderDetails.driverName}</span>
            </div>
          )}
          
          {orderDetails.vehicleInfo && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-onyx/70">Автомобиль:</span>
              <span className="font-medium">
                {orderDetails.vehicleInfo.model}, {orderDetails.vehicleInfo.color}, {orderDetails.vehicleInfo.plateNumber}
              </span>
            </div>
          )}
          
          {orderDetails.estimatedArrival && (
            <div className="flex justify-between items-center">
              <span className="text-onyx/70">Расчетное время:</span>
              <span className="font-medium">{orderDetails.estimatedArrival}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-end space-x-2">
        <button className="uber-button-outline py-2 px-4">
          Связаться
        </button>
        <button 
          className="uber-button py-2 px-4"
          onClick={() => fetchOrderStatus(orderId)}
        >
          Обновить статус
        </button>
      </div>
    </div>
  );
});

OrderTracker.displayName = 'OrderTracker';

export default OrderTracker;

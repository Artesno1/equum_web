// Version v1.0.7 - fix address fields
class API {
  constructor() {
    // Используем локальный прокси
    this.apiUrl = '/proxy.php';
    console.log('API инициализирован с прокси:', this.apiUrl);
  }

  // Генерирует ID заказа в формате web_timestamp
  generateOrderId() {
    return `web_${Date.now()}`;
  }

  async getOrder(orderId) {
    try {
      console.log(`Запрос заказа: ${orderId}`);
      
      // Создаем URL с параметром path
      const url = `${this.apiUrl}?path=/api/order/${orderId}`;
      console.log('Отправка запроса на:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      // Check if proxy returned error state
      if (data.proxy_error) {
        console.warn('Proxy error, using fallback data');
        return {
          ...this._getFallbackOrderData(orderId),
          proxy_error: true
        };
      }

      // Validate response structure
      if (!data.status || !data.id) {
        console.error('Invalid API response structure:', data);
        throw new Error('Некорректный формат ответа от сервера');
      }

      // Validate status
      const validStatuses = ['pending', 'accepted', 'driver_assigned', 'on_the_way', 'arrived', 'completed', 'cancelled'];
      if (!validStatuses.includes(data.status)) {
        console.error('Invalid status in response:', data.status);
        throw new Error(`Некорректный статус заказа: ${data.status}`);
      }

      console.log('Получены данные заказа:', data);
      return data;
    } catch (error) {
      console.error('Ошибка при запросе заказа:', error);
      return {
        ...this._getFallbackOrderData(orderId),
        proxy_error: true,
        error_message: error.message
      };
    }
  }

  async createOrder(orderData) {
    try {
      // Validate required fields
      if (!orderData.phone || !orderData.from_address || !orderData.to_address || !orderData.date || !orderData.time) {
        throw new Error('Отсутствуют обязательные поля заказа');
      }

      console.log('Исходные данные заказа:', JSON.stringify(orderData, null, 2));
      
      const apiOrderData = {
        name: orderData.name || `Клиент с сайта`,
        phone: orderData.phone,
        from_address: orderData.from_address,
        to_address: orderData.to_address,
        date: orderData.date,
        time: orderData.time,
        comment: orderData.comment || '',
        order_source: 'website'
      };
      
      const url = `${this.apiUrl}?path=/api/order`;
      console.log('Отправка запроса на:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(apiOrderData)
      });

      const responseText = await response.text();
      console.log('Ответ сервера:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Ошибка парсинга JSON:', e);
        throw new Error('Некорректный формат ответа от сервера');
      }

      // Check for proxy error
      if (data.proxy_error) {
        console.warn('Proxy error, using fallback mode');
        const fallbackOrderId = this.generateOrderId();
        return {
          success: true,
          orderId: fallbackOrderId,
          status: 'pending',
          proxy_error: true,
          message: 'Заказ принят в автономном режиме. Мы свяжемся с вами для подтверждения.',
          warning: 'Сервер временно недоступен, заказ будет обработан позже'
        };
      }

      // Validate response
      if (!data.id) {
        console.error('Missing order ID in response:', data);
        throw new Error('Некорректный ответ сервера: отсутствует ID заказа');
      }

      return {
        success: true,
        orderId: data.id,
        status: data.status || 'pending',
        ...data
      };
    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      
      // Return error state instead of silent fallback
      return {
        success: false,
        error: error.message,
        proxy_error: true,
        message: 'Произошла ошибка при создании заказа. Пожалуйста, попробуйте позже или свяжитесь с нами напрямую.'
      };
    }
  }

  // Резервные данные заказа
  _getFallbackOrderData(orderId) {
    return {
      id: orderId,
      status: 'pending',
      name: 'Клиент с сайта',
      phone: '79001234567',
      driver: {
        name: 'Михаил',
        phone: '+7 (900) 123-45-67'
      },
      estimatedArrival: '10-15 минут',
      vehicle: {
        model: 'Mercedes-Benz S-Class',
        color: 'Черный',
        plateNumber: 'А001АА77'
      },
      route: {
        pickup_address: 'Адрес отправления',
        destination_address: 'Адрес назначения'
      },
      datetime: new Date().toISOString(),
      message: "Ваш заказ принят и обрабатывается"
    };
  }
}

// Export for use in other files
window.API = API;

// Логирование версии для отладки
console.log('API.js v1.0.7 загружен (исправлены поля адресов)'); 

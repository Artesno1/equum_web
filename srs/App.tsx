import React, { useEffect, useState, useCallback } from 'react';
import { PhoneCall, Calendar, MapPin, Clock, Shield, CreditCard, Car, Menu, X, Star, ChevronRight, Users, CheckCircle, Mail, Baby } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import InputMask from 'react-input-mask';
import 'react-toastify/dist/ReactToastify.css';
import PhoneInput from './components/PhoneInput';
import OrderTracker from './components/OrderTracker';

interface OrderFormData {
  phone: string;
  pickupAddress: string;
  destinationAddress: string;
  dateTime: string;
}

// Функция для валидации телефона
const validatePhone = (phone: string): boolean => {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 11 && digitsOnly.startsWith('7');
};

// Функция для валидации адреса
const validateAddress = (address: string): boolean => {
  const sanitized = address.trim();
  return sanitized.length >= 5 && !/[<>]/.test(sanitized);
};

// Функция для валидации даты
const validateDateTime = (dateTime: string): boolean => {
  if (!dateTime) return false;
  const orderDate = new Date(dateTime);
  const now = new Date();
  return orderDate > now;
};

// Функция для генерации уникального ID заказа
const generateOrderId = (): string => {
  return `WEB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    phone: '',
    pickupAddress: '',
    destinationAddress: '',
    dateTime: '',
  });
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<OrderFormData>>({});
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Очищаем ошибку при вводе
    if (errors[name as keyof OrderFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      phone: value
    }));
    
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: ''
      }));
    }
  };

  const handlePickupAddressChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      pickupAddress: value
    }));
    
    if (errors.pickupAddress) {
      setErrors(prev => ({
        ...prev,
        pickupAddress: ''
      }));
    }
  };

  const handleDestinationAddressChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      destinationAddress: value
    }));
    
    if (errors.destinationAddress) {
      setErrors(prev => ({
        ...prev,
        destinationAddress: ''
      }));
    }
  };

  // Функция для прокрутки к форме заказа
  const scrollToOrderForm = () => {
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
      orderForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Функция для валидации формы
  const validateForm = (): boolean => {
    const newErrors: Partial<OrderFormData> = {};
    let isValid = true;

    // Валидация телефона
    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона';
      isValid = false;
    }

    // Валидация адреса подачи
    if (!validateAddress(formData.pickupAddress)) {
      newErrors.pickupAddress = 'Введите корректный адрес подачи';
      isValid = false;
    }

    // Валидация адреса назначения
    if (!validateAddress(formData.destinationAddress)) {
      newErrors.destinationAddress = 'Введите корректный адрес назначения';
      isValid = false;
    }

    // Валидация даты и времени
    if (!validateDateTime(formData.dateTime)) {
      newErrors.dateTime = 'Выберите корректную дату и время';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const api = new (window as any).API();
    // Используем API для генерации ID заказа
    const orderId = api.generateOrderId();
    
    submitOrder(formData, orderId);
  };

  const submitOrder = async (formData: OrderFormData, orderId: string) => {
    try {
      // Валидация формы
      if (!validateForm()) {
        toast.error('Пожалуйста, исправьте ошибки в форме', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }

      setIsSubmitting(true);
      
      // Форматирование телефона: удаление всех нецифровых символов
      const cleanPhone = formData.phone.replace(/\D/g, '');
      
      // Получаем отдельно дату и время
      const dateTimeObj = new Date(formData.dateTime);
      const formattedDate = dateTimeObj.toISOString().split('T')[0];
      const formattedTime = dateTimeObj.toTimeString().split(' ')[0].substring(0, 5);
      
      const orderData = {
        name: `Клиент с сайта (${cleanPhone})`,
        phone: cleanPhone,
        from_address: formData.pickupAddress,
        to_address: formData.destinationAddress,
        date: formattedDate,
        time: formattedTime,
        comment: 'Заказ с сайта equum.ru',
        order_source: 'website'
      };

      // Используем API класс
      const api = new (window as any).API();
      const result = await api.createOrder(orderData);
      
      console.log('Ответ сервера:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Произошла ошибка при отправке заказа');
      }

      // Handle proxy error state
      if (result.proxy_error) {
        toast.warning(result.warning || 'Сервер временно недоступен, но ваш заказ принят. Мы свяжемся с вами для подтверждения.', {
          position: "top-right",
          autoClose: 7000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.success('Заказ успешно отправлен! Мы свяжемся с вами в ближайшее время.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      
      // Сохраняем ID заказа для отслеживания
      setCurrentOrderId(result.orderId);
      setOrderSubmitted(true);
      
      // Очищаем форму
      setFormData({
        phone: '',
        pickupAddress: '',
        destinationAddress: '',
        dateTime: ''
      });
      
    } catch (error) {
      console.error('Error submitting order:', error);
      
      // Show more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при отправке заказа';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOrder = () => {
    setOrderSubmitted(false);
    setCurrentOrderId(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check localStorage for existing order ID
  useEffect(() => {
    const savedOrderId = localStorage.getItem('currentOrderId');
    if (savedOrderId) {
      setCurrentOrderId(savedOrderId);
      setOrderSubmitted(true);
    }
  }, []);

  // Save order ID to localStorage
  useEffect(() => {
    if (currentOrderId) {
      localStorage.setItem('currentOrderId', currentOrderId);
    } else {
      localStorage.removeItem('currentOrderId');
    }
  }, [currentOrderId]);

  return (
    <div className="min-h-screen bg-pearl flex flex-col">
      <ToastContainer />
      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'nav-blur' : 'bg-transparent'} flex justify-between items-center`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <Car className="h-8 w-8 text-gold" />
                <span className="ml-2 text-xl font-bold luxury-text">Equum</span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#services" className="nav-link">Услуги</a>
                <a href="#pricing" className="nav-link">Тарифы</a>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <button onClick={scrollToOrderForm} className="uber-button">
                <PhoneCall className="w-4 h-4" />
                Заказать
              </button>
            </div>

            <button
              className="md:hidden text-pearl hover:text-gold transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="mobile-menu">
            <div className="py-2">
              <a href="#services" className="mobile-menu-link">Услуги</a>
              <a href="#pricing" className="mobile-menu-link">Тарифы</a>
              <button onClick={scrollToOrderForm} className="w-full text-left mobile-menu-link">
                <span className="flex items-center">
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Заказать
                </span>
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col justify-center">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?auto=format&fit=crop&q=80"
            className="w-full h-full object-cover"
            alt="Mercedes V-Class"
            loading="eager"
          />
          <div className="gradient-overlay"></div>
        </div>
        <div className="relative flex items-center justify-center h-full">
          <div className="text-center text-pearl px-4 sm:px-6 lg:px-8 max-w-4xl">
            <h1 className="hero-text text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Премиальный транспортный сервис для вашего комфорта на каждый день!
            </h1>
            <p className="hero-text text-lg sm:text-xl mb-8 max-w-2xl mx-auto text-pearl/90">
              Персональный уровень обслуживания, безопасность и роскошь в каждой поездке
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={scrollToOrderForm}
                className="uber-button text-lg group"
              >
                <span>Заказать трансфер</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-title">Наши услуги</h2>
            <p className="section-subtitle mx-auto">
              Мы предоставляем полный спектр услуг для вашего комфортного перемещения по городу и за его пределами
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="feature-card">
              <div className="w-12 h-12 rounded-full bg-velvet/10 flex items-center justify-center mb-4">
                <Car className="w-6 h-6 text-velvet" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Трансфер по городу</h3>
              <p className="text-onyx/70">
                Комфортные поездки на премиум автомобилях по городу с профессиональными водителями
              </p>
            </div>
            
            <div className="feature-card">
              <div className="w-12 h-12 rounded-full bg-velvet/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-velvet" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Корпоративные поездки</h3>
              <p className="text-onyx/70">
                Специальные условия для компаний, включая персональный менеджер и отсрочку платежа
              </p>
            </div>
            
            <div className="feature-card">
              <div className="w-12 h-12 rounded-full bg-velvet/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-velvet" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Почасовая аренда</h3>
              <p className="text-onyx/70">
                Автомобиль с водителем на несколько часов для решения всех ваших задач
              </p>
            </div>
            
            <div className="feature-card">
              <div className="w-12 h-12 rounded-full bg-velvet/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-velvet" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Междугородние поездки</h3>
              <p className="text-onyx/70">
                Комфортные поездки между городами с опытными водителями
              </p>
            </div>
            
            <div className="feature-card">
              <div className="w-12 h-12 rounded-full bg-velvet/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-velvet" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Безопасность</h3>
              <p className="text-onyx/70">
                Строгие протоколы безопасности, проверенные водители и регулярное ТО автомобилей
              </p>
            </div>
            
            <div className="feature-card">
              <div className="w-12 h-12 rounded-full bg-velvet/10 flex items-center justify-center mb-4">
                <Baby className="w-6 h-6 text-velvet" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Трансфер с детьми</h3>
              <p className="text-onyx/70">
                Наши водители имеют всё необходимое для безопасной перевозки детей, включая детские кресла различных возрастных категорий
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Order form section */}
      <section id="order-form" className="py-20 bg-onyx/5 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Заказать поездку</h2>
            <p className="section-subtitle mx-auto">
              Заполните форму ниже, и мы свяжемся с вами для подтверждения заказа
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {orderSubmitted && currentOrderId ? (
              <div className="bg-pearl rounded-2xl shadow-xl p-6 md:p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold mb-2">Отслеживание заказа</h3>
                  <p className="text-onyx/70">
                    Вы можете следить за статусом вашего заказа ниже
                  </p>
                </div>
                
                <OrderTracker orderId={currentOrderId} />
                
                <div className="mt-8 text-center">
                  <button
                    onClick={resetOrder}
                    className="uber-button"
                  >
                    Оформить новый заказ
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-pearl rounded-2xl shadow-xl overflow-hidden">
                <div className="grid md:grid-cols-2">
                  <div className="p-6 md:p-8">
                    <h3 className="text-2xl font-semibold mb-6">Детали поездки</h3>
                    
                    <form onSubmit={handleSubmit}>
                      <PhoneInput 
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        error={errors.phone}
                      />
                      
                      <div className="mb-4">
                        <h4 className="text-lg font-medium mb-3">Адрес подачи</h4>
                        <div className="relative">
                          <input
                            type="text"
                            name="pickupAddress"
                            value={formData.pickupAddress}
                            onChange={handleInputChange}
                            placeholder="Введите адрес подачи"
                            className={`uber-input ${errors.pickupAddress ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {errors.pickupAddress && (
                            <p className="text-red-500 text-sm mt-1">{errors.pickupAddress}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="text-lg font-medium mb-3">Адрес назначения</h4>
                        <div className="relative">
                          <input
                            type="text"
                            name="destinationAddress"
                            value={formData.destinationAddress}
                            onChange={handleInputChange}
                            placeholder="Введите адрес назначения"
                            className={`uber-input ${errors.destinationAddress ? 'border-red-500 focus:ring-red-500' : ''}`}
                          />
                          {errors.destinationAddress && (
                            <p className="text-red-500 text-sm mt-1">{errors.destinationAddress}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-onyx/40">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <input
                            type="datetime-local"
                            name="dateTime"
                            value={formData.dateTime}
                            onChange={handleInputChange}
                            className={`uber-input pl-12 ${errors.dateTime ? 'border-red-500 focus:ring-red-500' : ''}`}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                        </div>
                        {errors.dateTime && <p className="text-red-500 text-sm mt-1">{errors.dateTime}</p>}
                      </div>
                      
                      <button
                        type="submit"
                        className="uber-button w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Отправка заказа...' : 'Заказать трансфер'}
                      </button>
                    </form>
                  </div>
                  
                  <div className="hidden md:block relative">
                    <img 
                      src="/images/luxury-car-interior.jpg"
                      className="absolute inset-0 h-full w-full object-cover"
                      alt="Luxury car interior"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-velvet/80 to-onyx/80"></div>
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="text-pearl">
                        <h3 className="text-3xl font-bold mb-4">Почему Equum?</h3>
                        <ul className="space-y-4">
                          <li className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-3 text-champagne" />
                            <span>Премиум автомобили</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-3 text-champagne" />
                            <span>Профессиональные водители</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-3 text-champagne" />
                            <span>Фиксированная стоимость</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-3 text-champagne" />
                            <span>Конфиденциальность</span>
                          </li>
                          <li className="flex items-center">
                            <CheckCircle className="w-5 h-5 mr-3 text-champagne" />
                            <span>Безопасность</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-onyx text-pearl py-12 flex flex-col items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Car className="h-8 w-8 text-champagne" />
                <span className="ml-2 text-xl font-bold luxury-text">Equum</span>
              </div>
              <p className="text-pearl/60 mb-4">
                Премиум транспортный сервис для тех, кто ценит комфорт и качество
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Контакты</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 text-champagne mr-2 mt-0.5" />
                  <span className="text-pearl/60">г. Москва, ул. Станиславского 21</span>
                </li>
                <li className="flex items-start">
                  <PhoneCall className="w-5 h-5 text-champagne mr-2 mt-0.5" />
                  <span className="text-pearl/60">TG @drivera</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-pearl/20 mt-12 pt-8 text-pearl/40 text-sm text-center">
            <p>© {new Date().getFullYear()} Equum. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

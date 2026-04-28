import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FileText, ChevronDown, ChevronUp, Shield, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface AgreementSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  content: string;
}

const AGREEMENTS: AgreementSection[] = [
  {
    id: 'offer',
    title: 'Оферта',
    icon: FileText,
    content: `ПУБЛИЧНАЯ ОФЕРТА

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Настоящий документ является официальным предложением (публичной офертой) профсоюзной организации и содержит все существенные условия предоставления услуг.
1.2. В соответствии с п. 2 ст. 437 Гражданского кодекса Российской Федерации данный документ является публичной офертой.
1.3. Акцептом настоящей оферты является регистрация на платформе и/или подача заявления о вступлении в профсоюз.

2. ПРЕДМЕТ ОФЕРТЫ
2.1. Профсоюзная организация предоставляет участнику доступ к платформе для получения информационных, консультационных и правовых услуг.
2.2. Объём и содержание услуг определяются текущим функционалом платформы.

3. ПРАВА И ОБЯЗАННОСТИ СТОРОН
3.1. Профсоюзная организация обязуется:
— обеспечить доступ к платформе;
— предоставлять консультационные услуги;
— защищать трудовые права участников.
3.2. Участник обязуется:
— предоставить достоверные данные при регистрации;
— соблюдать правила пользования платформой;
— своевременно уплачивать членские взносы.

4. ОТВЕТСТВЕННОСТЬ
4.1. Стороны несут ответственность в соответствии с действующим законодательством РФ.
4.2. Профсоюзная организация не несёт ответственности за убытки, возникшие вследствие форс-мажорных обстоятельств.

5. СРОК ДЕЙСТВИЯ
5.1. Оферта действует с момента публикации на платформе и до момента её отзыва.`,
  },
  {
    id: 'privacy',
    title: 'Политика конфиденциальности',
    icon: Shield,
    content: `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

1. СБОР ИНФОРМАЦИИ
1.1. При регистрации на платформе мы собираем следующие персональные данные: ФИО, адрес электронной почты, номер телефона, информацию о месте работы.
1.2. Автоматически собираются технические данные: IP-адрес, тип устройства, версия операционной системы, данные о взаимодействии с платформой.

2. ИСПОЛЬЗОВАНИЕ ИНФОРМАЦИИ
2.1. Персональные данные используются для:
— идентификации пользователя на платформе;
— предоставления услуг и поддержки;
— отправки уведомлений и информационных сообщений;
— улучшения качества сервиса.

3. ЗАЩИТА ДАННЫХ
3.1. Мы применяем организационные и технические меры для защиты персональных данных от несанкционированного доступа.
3.2. Данные хранятся на защищённых серверах с использованием шифрования.

4. ПЕРЕДАЧА ДАННЫХ ТРЕТЬИМ ЛИЦАМ
4.1. Мы не передаём персональные данные третьим лицам без согласия пользователя, за исключением случаев, предусмотренных законодательством.

5. ПРАВА ПОЛЬЗОВАТЕЛЯ
5.1. Пользователь имеет право:
— запросить информацию об обрабатываемых персональных данных;
— потребовать исправления или удаления персональных данных;
— отозвать согласие на обработку персональных данных.`,
  },
  {
    id: 'consent',
    title: 'Согласие на обработку ПД',
    icon: Lock,
    content: `СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ

Я, субъект персональных данных, в соответствии с Федеральным законом от 27.07.2006 г. № 152-ФЗ «О персональных данных», свободно, своей волей и в своём интересе даю согласие профсоюзной организации на обработку моих персональных данных.

ПЕРЕЧЕНЬ ПЕРСОНАЛЬНЫХ ДАННЫХ:
— фамилия, имя, отчество;
— адрес электронной почты;
— номер телефона;
— место работы и должность;
— город проживания;
— профессия.

ЦЕЛИ ОБРАБОТКИ:
— обеспечение участия в деятельности профсоюзной организации;
— предоставление правовой и консультационной поддержки;
— информирование о мероприятиях, акциях и новостях;
— формирование отчётности.

СПОСОБЫ ОБРАБОТКИ:
Сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача, обезличивание, блокирование, удаление, уничтожение персональных данных.

СРОК ДЕЙСТВИЯ:
Согласие действует с момента предоставления и до момента отзыва. Отзыв может быть подан в письменной форме.

Настоящее согласие может быть отозвано путём направления соответствующего заявления в профсоюзную организацию.`,
  },
];

export default function AgreementsScreen() {
  const { expand } = useLocalSearchParams<{ expand?: string }>();
  const [expandedId, setExpandedId] = useState<string | null>(expand ?? null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Соглашения', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {AGREEMENTS.map(agreement => {
          const Icon = agreement.icon;
          const isExpanded = expandedId === agreement.id;
          return (
            <View key={agreement.id} style={styles.agreementCard}>
              <TouchableOpacity
                style={styles.agreementHeader}
                onPress={() => setExpandedId(isExpanded ? null : agreement.id)}
                activeOpacity={0.8}
              >
                <View style={styles.agreementIconWrap}>
                  <Icon color={Colors.primary} size={20} />
                </View>
                <Text style={styles.agreementTitle}>{agreement.title}</Text>
                {isExpanded ? (
                  <ChevronUp color={Colors.primary} size={20} />
                ) : (
                  <ChevronDown color={Colors.textMuted} size={20} />
                )}
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.agreementContent}>
                  <Text style={styles.agreementText}>{agreement.content}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  agreementCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  agreementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  agreementTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  agreementContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  agreementText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
  },
});

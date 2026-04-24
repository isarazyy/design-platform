import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';
import 'dayjs/locale/zh-cn';

dayjs.extend(localeData);
dayjs.extend(weekday);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.locale('zh-cn');

export default dayjs;

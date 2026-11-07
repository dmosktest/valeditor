import type { IssueSeverity } from "./lint-json-yaml";
import type { Locale } from "./site-config";

export type RuleTab =
  | "common"
  | "json-yaml"
  | "docker"
  | "k8s"
  | "gitlab"
  | "github";

export type RuleCopy = { title: string; why: string; fix: string };

export type RuleDef = {
  code: string;
  tab: RuleTab;
  severity: IssueSeverity;
  ru: RuleCopy;
  en: RuleCopy;
};

export const RULE_CATALOG: RuleDef[] = [
  {
    code: 'emptyInput',
    tab: 'common',
    severity: 'error',
    ru: { title: 'Пустой ввод', why: 'Нечего проверять.', fix: 'Вставьте текст конфига.' },
    en: { title: 'Empty input', why: 'Nothing to lint.', fix: 'Paste a config.' },
  },
  {
    code: 'bom',
    tab: 'common',
    severity: 'warning',
    ru: { title: 'BOM в начале файла', why: 'BOM ломает некоторые парсеры и CI.', fix: 'Сохраните файл в UTF-8 без BOM.' },
    en: { title: 'Byte order mark (BOM)', why: 'A BOM breaks some parsers and CI tools.', fix: 'Save as UTF-8 without BOM.' },
  },
  {
    code: 'jsonSyntax',
    tab: 'json-yaml',
    severity: 'error',
    ru: { title: 'Ошибка синтаксиса JSON', why: 'JSON не разбирается парсером.', fix: 'Исправьте скобки, запятые и кавычки по позиции.' },
    en: { title: 'JSON syntax error', why: 'The JSON cannot be parsed.', fix: 'Fix brackets, commas and quotes at the reported position.' },
  },
  {
    code: 'yamlSyntax',
    tab: 'json-yaml',
    severity: 'error',
    ru: { title: 'Ошибка синтаксиса YAML', why: 'YAML не разбирается парсером.', fix: 'Проверьте отступы и спецсимволы на указанной строке.' },
    en: { title: 'YAML syntax error', why: 'The YAML cannot be parsed.', fix: 'Check indentation and special characters on the reported line.' },
  },
  {
    code: 'jsonDuplicateKey',
    tab: 'json-yaml',
    severity: 'warning',
    ru: { title: 'Дубликат ключа в JSON', why: 'Повтор ключа обычно затирает предыдущее значение.', fix: 'Оставьте один ключ или переименуйте.' },
    en: { title: 'Duplicate JSON key', why: 'A duplicate key usually overwrites the earlier value.', fix: 'Keep a single key or rename one of them.' },
  },
  {
    code: 'yamlDuplicateKey',
    tab: 'json-yaml',
    severity: 'error',
    ru: { title: 'Дубликат ключа в YAML', why: 'Дубликаты в YAML часто молча перезаписываются.', fix: 'Удалите или объедините повторяющиеся ключи.' },
    en: { title: 'Duplicate YAML key', why: 'Duplicate YAML keys are often overwritten silently.', fix: 'Remove or merge the duplicate keys.' },
  },
  {
    code: 'yamlMultiDoc',
    tab: 'json-yaml',
    severity: 'info',
    ru: { title: 'Несколько документов YAML', why: 'Файл содержит несколько документов через ---.', fix: 'Это нормально для манифестов; убедитесь, что так задумано.' },
    en: { title: 'Multi-document YAML', why: 'The file contains several documents separated by ---.', fix: 'Fine for manifests; confirm it is intentional.' },
  },
  {
    code: 'yamlBoolish',
    tab: 'json-yaml',
    severity: 'warning',
    ru: { title: 'Булево из YAML 1.1 (Norway problem)', why: 'В YAML 1.1 значения вроде NO, YES, on, off без кавычек становятся true/false. Страна NO превращается в false.', fix: 'Закавычьте: country: "NO".' },
    en: { title: 'YAML 1.1 boolish value (Norway problem)', why: 'In YAML 1.1 bare NO, YES, on, off become booleans. Country code NO becomes false.', fix: 'Quote it: country: "NO".' },
  },
  {
    code: 'yamlTabIndent',
    tab: 'json-yaml',
    severity: 'warning',
    ru: { title: 'Таб в отступе YAML', why: 'YAML запрещает табы для отступов.', fix: 'Замените табы пробелами.' },
    en: { title: 'Tab character in YAML indent', why: 'YAML forbids tabs for indentation.', fix: 'Replace tabs with spaces.' },
  },
  {
    code: 'yamlLeadingZero',
    tab: 'json-yaml',
    severity: 'info',
    ru: { title: 'Число с ведущим нулём', why: 'YAML может трактовать 012 как восьмеричное или странное число.', fix: 'Закавычьте строку: code: "012".' },
    en: { title: 'Leading-zero number', why: 'YAML may treat 012 as octal or an unexpected number.', fix: 'Quote it: code: "012".' },
  },
  {
    code: 'dfMissingFrom',
    tab: 'docker',
    severity: 'error',
    ru: { title: 'Нет инструкции FROM', why: 'Dockerfile обязан начинаться с базового образа.', fix: 'Добавьте FROM <image>:<tag>.' },
    en: { title: 'Missing FROM instruction', why: 'A Dockerfile must start from a base image.', fix: 'Add FROM <image>:<tag>.' },
  },
  {
    code: 'dfLatestTag',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'Тег latest у образа', why: 'latest плавает и ломает воспроизводимость сборок.', fix: 'Укажите конкретный тег или digest.' },
    en: { title: 'latest image tag', why: 'latest floats and breaks reproducible builds.', fix: 'Pin a concrete tag or digest.' },
  },
  {
    code: 'dfPreferCopy',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'ADD вместо COPY', why: 'ADD умеет распаковку и URL — часто неожиданно.', fix: 'Для локальных файлов используйте COPY.' },
    en: { title: 'Prefer COPY over ADD', why: 'ADD unpacks archives and fetches URLs, often surprisingly.', fix: 'Use COPY for local files.' },
  },
  {
    code: 'dfPipeShell',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'curl|sh в RUN', why: 'Скрипт с сети выполняется без проверки целостности.', fix: 'Скачайте, проверьте checksum, затем запускайте.' },
    en: { title: 'curl|sh pipe in RUN', why: 'A remote script runs without integrity checks.', fix: 'Download, verify a checksum, then run.' },
  },
  {
    code: 'dfAptClean',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'apt без очистки lists', why: 'Кэш apt раздувает слой образа.', fix: 'В том же RUN: rm -rf /var/lib/apt/lists/*.' },
    en: { title: 'apt without cleaning lists', why: 'apt cache bloats the image layer.', fix: 'In the same RUN: rm -rf /var/lib/apt/lists/*.' },
  },
  {
    code: 'dfUseWorkdir',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'cd в RUN вместо WORKDIR', why: 'cd в одном RUN не действует на следующие.', fix: 'Используйте WORKDIR.' },
    en: { title: 'cd in RUN instead of WORKDIR', why: 'cd in one RUN does not affect later instructions.', fix: 'Use WORKDIR.' },
  },
  {
    code: 'dfSecretEnv',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'Секрет в ENV/ARG', why: 'Секреты в слоях образа легко извлечь.', fix: 'Передавайте секреты в runtime (Compose secrets, K8s Secret).' },
    en: { title: 'Secret-like ENV/ARG', why: 'Secrets in image layers are easy to extract.', fix: 'Pass secrets at runtime (Compose secrets, K8s Secret).' },
  },
  {
    code: 'dfRootUser',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'Процесс от root', why: 'Контейнер без USER root увеличивает blast radius.', fix: 'Добавьте USER nonroot перед CMD.' },
    en: { title: 'Running as root', why: 'A container without a non-root USER widens blast radius.', fix: 'Add USER nonroot before CMD.' },
  },
  {
    code: 'dfNoHealthcheck',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'Нет HEALTHCHECK', why: 'Оркестратор не узнает, что процесс «жив, но болен».', fix: 'Добавьте HEALTHCHECK CMD ….' },
    en: { title: 'No HEALTHCHECK', why: 'Orchestrators cannot detect a live-but-unhealthy process.', fix: 'Add HEALTHCHECK CMD ….' },
  },
  {
    code: 'composeNotMapping',
    tab: 'docker',
    severity: 'error',
    ru: { title: 'Compose не объект', why: 'Корень compose должен быть mapping.', fix: 'Проверьте YAML-структуру файла.' },
    en: { title: 'Compose root is not a mapping', why: 'Compose root must be a mapping.', fix: 'Fix the YAML structure.' },
  },
  {
    code: 'composeVersionObsolete',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'Поле version устарело', why: 'В Compose Specification поле version не нужно.', fix: 'Удалите ключ version:.' },
    en: { title: 'Obsolete version field', why: 'Compose Specification no longer needs version.', fix: 'Remove the version: key.' },
  },
  {
    code: 'composeNoServices',
    tab: 'docker',
    severity: 'error',
    ru: { title: 'Нет services', why: 'Без сервисов compose бесполезен.', fix: 'Опишите блок services:.' },
    en: { title: 'No services', why: 'Compose needs at least one service.', fix: 'Define a services: block.' },
  },
  {
    code: 'composeServiceInvalid',
    tab: 'docker',
    severity: 'error',
    ru: { title: 'Сервис не объект', why: 'Сервис должен быть mapping.', fix: 'Исправьте структуру сервиса.' },
    en: { title: 'Service is not a mapping', why: 'Each service must be a mapping.', fix: 'Fix the service structure.' },
  },
  {
    code: 'composeNeedImageOrBuild',
    tab: 'docker',
    severity: 'error',
    ru: { title: 'Нет image и build', why: 'Сервису нужен image или build.', fix: 'Добавьте image: или build:.' },
    en: { title: 'Missing image or build', why: 'A service needs image or build.', fix: 'Add image: or build:.' },
  },
  {
    code: 'composePrivileged',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'privileged: true', why: 'Полный доступ к хосту — высокий риск.', fix: 'Уберите privileged или сузьте capabilities.' },
    en: { title: 'privileged: true', why: 'Full host access is high risk.', fix: 'Drop privileged or narrow capabilities.' },
  },
  {
    code: 'composeHostNetwork',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'network_mode: host', why: 'Сеть хоста обходит изоляцию контейнера.', fix: 'Используйте bridge/overlay, если возможно.' },
    en: { title: 'network_mode: host', why: 'Host networking bypasses container isolation.', fix: 'Prefer bridge/overlay when possible.' },
  },
  {
    code: 'composeLatestTag',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'latest в image', why: 'Плавающий тег ломает воспроизводимость.', fix: 'Зафиксируйте тег образа.' },
    en: { title: 'latest in Compose image', why: 'A floating tag breaks reproducibility.', fix: 'Pin the image tag.' },
  },
  {
    code: 'composePortAsString',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'Порт числом', why: 'Числовой порт YAML может трактовать неоднозначно.', fix: 'Пишите порты строкой: "8080:80".' },
    en: { title: 'Numeric port mapping', why: 'A bare number may be parsed ambiguously.', fix: 'Write ports as strings: "8080:80".' },
  },
  {
    code: 'composeNoHealthcheck',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'У сервиса нет healthcheck', why: 'Без healthcheck restart/depends_on менее надёжны.', fix: 'Добавьте healthcheck: для сервиса.' },
    en: { title: 'Service has no healthcheck', why: 'Without healthcheck, restarts/depends_on are weaker.', fix: 'Add a healthcheck: for the service.' },
  },
  {
    code: 'composeNoRestart',
    tab: 'docker',
    severity: 'info',
    ru: { title: 'Нет restart policy', why: 'После сбоя сервис может не подняться.', fix: 'Задайте restart: unless-stopped (или нужную политику).' },
    en: { title: 'No restart policy', why: 'After a crash the service may stay down.', fix: 'Set restart: unless-stopped (or the policy you need).' },
  },
  {
    code: 'composeDockerSock',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'Монтирование docker.sock', why: 'Доступ к сокету Docker = root на хосте.', fix: 'Избегайте или используйте rootless/ограниченный прокси.' },
    en: { title: 'docker.sock bind mount', why: 'Docker socket access is effectively host root.', fix: 'Avoid it or use rootless/limited proxies.' },
  },
  {
    code: 'composeSecretEnv',
    tab: 'docker',
    severity: 'warning',
    ru: { title: 'Секрет в environment', why: 'Секреты в env попадают в docker inspect и логи.', fix: 'Используйте secrets: / файл / внешний vault.' },
    en: { title: 'Secret-like environment value', why: 'Env secrets show up in docker inspect and logs.', fix: 'Use secrets:, a file, or an external vault.' },
  },
  {
    code: 'k8sMissingApiVersion',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Нет apiVersion', why: 'Без apiVersion объект невалиден.', fix: 'Добавьте apiVersion: …' },
    en: { title: 'Missing apiVersion', why: 'Without apiVersion the object is invalid.', fix: 'Add apiVersion: …' },
  },
  {
    code: 'k8sMissingKind',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Нет kind', why: 'Без kind API не знает тип ресурса.', fix: 'Добавьте kind: …' },
    en: { title: 'Missing kind', why: 'Without kind the API cannot type the resource.', fix: 'Add kind: …' },
  },
  {
    code: 'k8sMissingName',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Нет metadata.name', why: 'Имя обязательно для большинства ресурсов.', fix: 'Задайте metadata.name.' },
    en: { title: 'Missing metadata.name', why: 'Most resources require a name.', fix: 'Set metadata.name.' },
  },
  {
    code: 'k8sMissingSelector',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Нет selector', why: 'Deployment/StatefulSet без selector не управляет подами.', fix: 'Добавьте spec.selector.matchLabels.' },
    en: { title: 'Missing selector', why: 'Deployment/StatefulSet without selector cannot manage pods.', fix: 'Add spec.selector.matchLabels.' },
  },
  {
    code: 'k8sNoContainers',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Нет containers', why: 'В поде должен быть хотя бы один контейнер.', fix: 'Опишите spec.template.spec.containers.' },
    en: { title: 'No containers', why: 'A pod needs at least one container.', fix: 'Define spec.template.spec.containers.' },
  },
  {
    code: 'k8sContainerNoImage',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'У контейнера нет image', why: 'Без image под не стартует.', fix: 'Укажите image: repo:tag.' },
    en: { title: 'Container has no image', why: 'Without image the pod cannot start.', fix: 'Set image: repo:tag.' },
  },
  {
    code: 'k8sLatestTag',
    tab: 'k8s',
    severity: 'warning',
    ru: { title: 'latest / без тега', why: 'Плавающий тег в кластере опасен.', fix: 'Зафиксируйте тег или digest.' },
    en: { title: 'latest or untagged image', why: 'Floating tags are dangerous in clusters.', fix: 'Pin a tag or digest.' },
  },
  {
    code: 'k8sNoResources',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'Нет resources', why: 'Без requests/limits планировщик и QoS страдают.', fix: 'Добавьте resources.requests и limits.' },
    en: { title: 'No resources block', why: 'Without requests/limits scheduling and QoS suffer.', fix: 'Add resources.requests and limits.' },
  },
  {
    code: 'k8sNoRequests',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'Нет resources.requests', why: 'Без requests под сложно планировать.', fix: 'Задайте requests.cpu/memory.' },
    en: { title: 'Missing resources.requests', why: 'Without requests scheduling is harder.', fix: 'Set requests.cpu/memory.' },
  },
  {
    code: 'k8sNoLimits',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'Нет resources.limits', why: 'Без limits контейнер может съесть ноду.', fix: 'Задайте limits.cpu/memory.' },
    en: { title: 'Missing resources.limits', why: 'Without limits a container can starve the node.', fix: 'Set limits.cpu/memory.' },
  },
  {
    code: 'k8sPrivileged',
    tab: 'k8s',
    severity: 'warning',
    ru: { title: 'privileged контейнер', why: 'privileged почти равен root на ноде.', fix: 'Уберите privileged: true.' },
    en: { title: 'Privileged container', why: 'privileged is nearly node root.', fix: 'Remove privileged: true.' },
  },
  {
    code: 'k8sHostNetwork',
    tab: 'k8s',
    severity: 'warning',
    ru: { title: 'hostNetwork: true', why: 'Сеть ноды без изоляции пода.', fix: 'Отключите hostNetwork, если можно.' },
    en: { title: 'hostNetwork: true', why: 'Node networking without pod isolation.', fix: 'Disable hostNetwork when possible.' },
  },
  {
    code: 'k8sEmpty',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Пустой манифест', why: 'Нет документов для проверки.', fix: 'Вставьте YAML манифеста.' },
    en: { title: 'Empty manifest', why: 'No documents to check.', fix: 'Paste a manifest YAML.' },
  },
  {
    code: 'k8sNotMapping',
    tab: 'k8s',
    severity: 'error',
    ru: { title: 'Документ не объект', why: 'Каждый документ должен быть mapping.', fix: 'Исправьте структуру YAML.' },
    en: { title: 'Document is not a mapping', why: 'Each document must be a mapping.', fix: 'Fix the YAML structure.' },
  },
  {
    code: 'k8sNoProbes',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'Нет probes', why: 'Без probes Kubernetes не знает о деградации.', fix: 'Добавьте readinessProbe и/или livenessProbe.' },
    en: { title: 'No liveness/readiness probes', why: 'Without probes Kubernetes cannot detect degradation.', fix: 'Add readinessProbe and/or livenessProbe.' },
  },
  {
    code: 'k8sNoRunAsNonRoot',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'Нет runAsNonRoot', why: 'Контейнер может запуститься от root.', fix: 'securityContext.runAsNonRoot: true.' },
    en: { title: 'Missing runAsNonRoot', why: 'The container may run as root.', fix: 'Set securityContext.runAsNonRoot: true.' },
  },
  {
    code: 'k8sNoReadOnlyRoot',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'Нет readOnlyRootFilesystem', why: 'Запись в корень FS упрощает компрометацию.', fix: 'securityContext.readOnlyRootFilesystem: true + volume для tmp.' },
    en: { title: 'Missing readOnlyRootFilesystem', why: 'A writable root FS eases compromise.', fix: 'Set readOnlyRootFilesystem: true and a tmp volume.' },
  },
  {
    code: 'k8sImagePullAlways',
    tab: 'k8s',
    severity: 'info',
    ru: { title: 'imagePullPolicy: Always', why: 'Always с плавающим тегом тянет образ на каждый старт.', fix: 'Зафиксируйте тег/digest или Instant/IfNotPresent.' },
    en: { title: 'imagePullPolicy: Always', why: 'Always with a floating tag re-pulls on every start.', fix: 'Pin tag/digest or use IfNotPresent.' },
  },
  {
    code: 'k8sServiceNoSelector',
    tab: 'k8s',
    severity: 'warning',
    ru: { title: 'Service без selector', why: 'Трафик не попадёт в поды (кроме ExternalName/ручных endpoints).', fix: 'Добавьте spec.selector или оформите endpoints явно.' },
    en: { title: 'Service without selector', why: 'Traffic will not reach pods (except ExternalName/manual endpoints).', fix: 'Add spec.selector or define Endpoints explicitly.' },
  },
  {
    code: 'glNotMapping',
    tab: 'gitlab',
    severity: 'error',
    ru: { title: 'CI файл не объект', why: 'Корень .gitlab-ci.yml — mapping.', fix: 'Исправьте YAML.' },
    en: { title: 'CI file is not a mapping', why: 'Root of .gitlab-ci.yml must be a mapping.', fix: 'Fix the YAML.' },
  },
  {
    code: 'glJobNotMapping',
    tab: 'gitlab',
    severity: 'warning',
    ru: { title: 'Job не объект', why: 'Job должен быть mapping.', fix: 'Проверьте структуру job.' },
    en: { title: 'Job is not a mapping', why: 'A job must be a mapping.', fix: 'Fix the job structure.' },
  },
  {
    code: 'glJobNoScript',
    tab: 'gitlab',
    severity: 'error',
    ru: { title: 'У job нет script', why: 'Без script/trigger job пустой.', fix: 'Добавьте script: или extends с script.' },
    en: { title: 'Job has no script', why: 'Without script/trigger the job is empty.', fix: 'Add script: or extends that provides script.' },
  },
  {
    code: 'glOnlyAndRules',
    tab: 'gitlab',
    severity: 'warning',
    ru: { title: 'only и rules вместе', why: 'only/except и rules конфликтуют по смыслу.', fix: 'Оставьте только rules:.' },
    en: { title: 'only and rules together', why: 'only/except and rules conflict conceptually.', fix: 'Keep only rules:.' },
  },
  {
    code: 'glLatestImage',
    tab: 'gitlab',
    severity: 'warning',
    ru: { title: 'image: …:latest', why: 'Плавающий образ CI ломает воспроизводимость.', fix: 'Зафиксируйте тег образа job.' },
    en: { title: 'Job image uses latest', why: 'A floating CI image breaks reproducibility.', fix: 'Pin the job image tag.' },
  },
  {
    code: 'glNoJobs',
    tab: 'gitlab',
    severity: 'error',
    ru: { title: 'Нет job’ов', why: 'Не найдены job’ы и нет include.', fix: 'Добавьте job или include:.' },
    en: { title: 'No jobs found', why: 'No jobs and no include.', fix: 'Add a job or include:.' },
  },
  {
    code: 'glEmptyStages',
    tab: 'gitlab',
    severity: 'warning',
    ru: { title: 'Пустой stages', why: 'Пустой stages ломает пайплайн.', fix: 'Перечислите stages или удалите ключ.' },
    en: { title: 'Empty stages list', why: 'An empty stages list breaks the pipeline.', fix: 'List stages or remove the key.' },
  },
  {
    code: 'glCurlPipe',
    tab: 'gitlab',
    severity: 'warning',
    ru: { title: 'curl|bash в script', why: 'Скрипт с сети без проверки — риск supply chain.', fix: 'Скачайте артефакт с checksum или используйте образ с инструментом.' },
    en: { title: 'curl|bash in script', why: 'Remote script without verification is a supply-chain risk.', fix: 'Fetch with checksum or bake the tool into the image.' },
  },
  {
    code: 'glAllowFailure',
    tab: 'gitlab',
    severity: 'info',
    ru: { title: 'allow_failure: true', why: 'Ошибки job не валят пайплайн.', fix: 'Оставьте только для genuinely optional шагов.' },
    en: { title: 'allow_failure: true', why: 'Job failures will not fail the pipeline.', fix: 'Keep only for genuinely optional steps.' },
  },
  {
    code: 'ghNotMapping',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Workflow не объект', why: 'Корень workflow — mapping.', fix: 'Исправьте YAML.' },
    en: { title: 'Workflow is not a mapping', why: 'Workflow root must be a mapping.', fix: 'Fix the YAML.' },
  },
  {
    code: 'ghMissingOn',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Нет on:', why: 'Без on workflow не запускается.', fix: 'Добавьте on: (или \'on\':).' },
    en: { title: 'Missing on:', why: 'Without on the workflow never runs.', fix: 'Add on: (or \'on\':).' },
  },
  {
    code: 'ghNoJobs',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Нет jobs', why: 'Нужен хотя бы один job.', fix: 'Опишите jobs:.' },
    en: { title: 'No jobs', why: 'At least one job is required.', fix: 'Define jobs:.' },
  },
  {
    code: 'ghJobInvalid',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Job не объект', why: 'Job должен быть mapping.', fix: 'Исправьте структуру job.' },
    en: { title: 'Job is not a mapping', why: 'A job must be a mapping.', fix: 'Fix the job structure.' },
  },
  {
    code: 'ghMissingRunsOn',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Нет runs-on', why: 'Job без runs-on/uses негде бежать.', fix: 'Добавьте runs-on: ubuntu-latest.' },
    en: { title: 'Missing runs-on', why: 'A job needs runs-on or uses.', fix: 'Add runs-on: ubuntu-latest.' },
  },
  {
    code: 'ghEmptySteps',
    tab: 'github',
    severity: 'warning',
    ru: { title: 'Пустые steps', why: 'Job без шагов ничего не делает.', fix: 'Добавьте steps:.' },
    en: { title: 'Empty steps', why: 'A job with no steps does nothing.', fix: 'Add steps:.' },
  },
  {
    code: 'ghStepNoRunOrUses',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Шаг без run/uses', why: 'Шаг должен что-то выполнять.', fix: 'Добавьте run: или uses:.' },
    en: { title: 'Step has neither run nor uses', why: 'A step must run something.', fix: 'Add run: or uses:.' },
  },
  {
    code: 'ghActionUnpinned',
    tab: 'github',
    severity: 'warning',
    ru: { title: 'Action без @version', why: 'Без @ тега/sha действие плавает.', fix: 'Укажите uses: owner/action@v4 или @sha.' },
    en: { title: 'Action has no @ pin', why: 'Without @ tag/sha the action floats.', fix: 'Set uses: owner/action@v4 or @sha.' },
  },
  {
    code: 'ghMissingSteps',
    tab: 'github',
    severity: 'error',
    ru: { title: 'Нет steps', why: 'Обычному job нужны steps.', fix: 'Добавьте steps: или reusable workflow uses:.' },
    en: { title: 'Missing steps', why: 'A normal job needs steps.', fix: 'Add steps: or a reusable workflow uses:.' },
  },
  {
    code: 'ghNoPermissions',
    tab: 'github',
    severity: 'info',
    ru: { title: 'Нет permissions', why: 'Без явных permissions токен шире необходимого.', fix: 'Задайте permissions: на workflow или job (минимальные).' },
    en: { title: 'Missing permissions', why: 'Without explicit permissions the token is broader than needed.', fix: 'Set permissions: on the workflow or job (least privilege).' },
  },
  {
    code: 'ghPrTargetRisky',
    tab: 'github',
    severity: 'warning',
    ru: { title: 'pull_request_target риск', why: 'pr_target + checkout PR-кода даёт доступ к секретам из форка.', fix: 'Не checkout’ьте код PR при pull_request_target или сузьте permissions.' },
    en: { title: 'Risky pull_request_target', why: 'pr_target plus checking out PR code can expose secrets to forks.', fix: 'Do not check out untrusted PR code under pull_request_target.' },
  },
  {
    code: 'ghEchoSecret',
    tab: 'github',
    severity: 'warning',
    ru: { title: 'Секрет в echo/run', why: 'Секреты в логах GitHub маскируются неидеально.', fix: 'Не печатайте secrets; передавайте через env action’ам.' },
    en: { title: 'Secret echoed in run', why: 'Secrets in logs are imperfectly masked.', fix: 'Do not print secrets; pass them via env to actions.' },
  },
];

const BY_CODE = new Map(RULE_CATALOG.map((r) => [r.code, r]));

export function getRule(code: string): RuleDef | undefined {
  return BY_CODE.get(code);
}

export function ruleCopy(code: string, locale: Locale): RuleCopy {
  const rule = getRule(code);
  if (!rule) {
    return {
      title: code,
      why: locale === "ru" ? "Смотрите справочник правил." : "See the rules handbook.",
      fix: locale === "ru" ? "Исправьте замечание по контексту." : "Fix the finding using context.",
    };
  }
  return locale === "ru" ? rule.ru : rule.en;
}

export function listRulesForLocale(locale: Locale): Array<RuleDef & { copy: RuleCopy }> {
  return RULE_CATALOG.map((r) => ({ ...r, copy: locale === "ru" ? r.ru : r.en }));
}


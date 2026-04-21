/**
 * Aviso de Privacidad y Protección de Datos Personales
 * Contenido formateado en HTML para el frontend
 * Versión simplificada para el titular - sin detalles técnicos excesivos
 */
module.exports = {
  version: '1.2',
  updated_at: '2026-04-21',
  content: `
    <p class="subtitle">Sistema de Registro Metodológico de Métricas Lingüísticas</p>
    <p class="version">Versión 1.2 · Fecha de emisión: 21 de Abril de 2026 · Estado: Vigente</p>

    <hr />

    <h2>Marco Normativo</h2>
    <p>El presente Aviso de Privacidad se emite en cumplimiento de la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y sus recomendaciones.</p>

    <p>
      <strong>Nota sobre la licencia del software:</strong> La licencia MIT aplicable
      al código fuente de esta Plataforma no se extiende a los datos personales ni
      a los datasets de investigación, los cuales se rigen exclusivamente por este
      Aviso de Privacidad y los Términos y Condiciones del proyecto.
    </p>

    <hr />

    <h2>1. Identidad y Domicilio del Responsable</h2>
    <p>El <strong>responsable</strong> del tratamiento de los datos personales es el <strong>equipo académico responsable del proyecto</strong>
    "Sistema de Registro Metodológico de Métricas Lingüísticas", con domicilio para notificaciones en la dirección institucional
    comunicada a través de los canales oficiales.</p>
    <p>Para ejercer tus derechos ARCO, puedes dirigirte al responsable mediante los canales de contacto publicados en el repositorio oficial del proyecto.</p>

    <hr />

    <h2>2. Datos Personales Recabados</h2>

    <h3>2.1 Usuarios Operativos</h3>
    <p>Los aplicadores, investigadores y administradores son personas que acceden al Sistema para realizar funciones operativas. Los datos recabados de este grupo son:</p>
    <ul>
      <li><strong>Nombre</strong>, para identificación dentro del sistema y comunicación interna.</li>
      <li><strong>Correo electrónico institucional</strong>, para identificación, autenticación y activación de cuenta.</li>
      <li><strong>Teléfono</strong> (solo en caso de contacto necesario), para notificaciones operativas cuando así se requiera.</li>
      <li><strong>Contraseña</strong>, almacenada de forma segura, nunca en texto plano.</li>
      <li><strong>Rol asignado</strong>, para control de acceso basado en funciones.</li>
      <li><strong>Registros de sesiones y auditoría</strong>, para seguridad y trazabilidad.</li>
      <li><strong>Estado de cuenta</strong> (activo/inactivo), para gestión de acceso y continuidad del servicio.</li>
    </ul>
    <p>Estos datos son <strong>datos personales</strong> que, en el sentido del artículo 3°, fracción VI, de la LFPDPPP, no son sensibles, ya que no revelan origen étnico, preferencias políticas, creencias religiosas, salud, orientación sexual ni otros datos de alto riesgo; sin embargo, el teléfono se limita a fines de contacto operativo dentro del proyecto y no se comparte con finalidades distintas al servicio.</p>

    <h3>2.2 Sujetos de Estudio</h3>
    <p>Los sujetos de estudio son las personas sobre quienes se aplican los instrumentos metodológicos. El sistema está diseñado para que <strong>no sean identificables</strong>:</p>
    <ul>
      <li>Se utilizan identificadores automáticos (UUID) que no derivan de datos personales.</li>
      <li>Se registran datos contextuales genéricos como tipo de escuela, nivel educativo, rango de edad, género y nivel socioeconómico.</li>
    </ul>
    <p><strong>No se almacenan</strong> nombres, apellidos, CURP, RFC, correo electrónico, teléfono, dirección ni ningún otro dato personal identificable de los sujetos de estudio.</p>

    <hr />

    <h2>3. Finalidades del Tratamiento</h2>

    <h3>3.1 Finalidades primarias</h3>
    <ul>
      <li><strong>Autenticación y control de acceso:</strong> verificar identidad y garantizar que cada rol acceda únicamente a las funciones que le corresponden.</li>
      <li><strong>Registro de evaluaciones:</strong> capturar y almacenar datos de las sesiones de evaluación lingüística.</li>
      <li><strong>Generación de dataset:</strong> consolidar registros anonimizados para su consulta y exportación por parte del equipo investigador.</li>
      <li><strong>Seguridad:</strong> mantener registros de sesiones y auditoría para proteger la integridad de los datos y detectar accesos no autorizados.</li>
    </ul>

    <h3>3.2 Finalidades secundarias</h3>
    <p>El Sistema <strong>no utiliza</strong> los datos recabados para:</p>
    <ul>
      <li>Mercadotecnia, publicidad o prospección comercial.</li>
      <li>Cesión o transferencia a terceros con fines distintos al proyecto académico.</li>
      <li>Perfilado de usuarios operativos.</li>
    </ul>

    <hr />

    <h2>4. Cómo Recabamos tus Datos</h2>

    <h3>4.1 Registro de Usuarios</h3>
    <p>El administrador registra a cada aplicador o investigador mediante un formulario del sistema. Posteriormente, el usuario recibe un correo con un enlace de activación para completar su registro estableciendo su contraseña.</p>

    <h3>4.2 Autenticación</h3>
    <p>El acceso se realiza mediante correo electrónico institucional y contraseña, o bien mediante inicio de sesión único proporcionado por la institución, sin que el sistema almacene contraseñas adicionales.</p>

    <h3>4.3 Registro de Sujetos de Estudio</h3>
    <p>El aplicador registra a los sujetos de estudio mediante un formulario operativo. El sistema genera automáticamente un identificador anónimo (UUID) sin solicitar datos personales.</p>

    <h3>4.4 Captura de Métricas</h3>
    <p>Los datos de evaluación se registran de forma segura y completa; si alguna validación falla, no se persiste ningún dato parcial.</p>

    <hr />

    <h2>5. Transferencia de Datos</h2>
    <p>Los datos personales <strong>no se transferirán</strong> a terceros ajenos al proyecto, salvo en los supuestos de obligación legal, resolución de autoridad competente u otros casos expresamente previstos por la LFPDPPP.</p>
    <p>El dataset de investigación generado es <strong>anónimo e irreversiblemente desvinculado</strong> de datos personales, por lo que su uso, publicación o intercambio en la comunidad científica no constituye tratamiento de datos personales.</p>

    <hr />

    <h2>6. Derechos ARCO</h2>
    <p>En términos de la LFPDPPP, tienes derecho a:</p>
    <ul>
      <li><strong>Acceso:</strong> conocer qué datos personales se tienen registrados y cómo se tratan.</li>
      <li><strong>Rectificación:</strong> solicitar corrección de datos inexactos o incompletos.</li>
      <li><strong>Cancelación:</strong> solicitar supresión cuando ya no sean necesarios para las finalidades del tratamiento.</li>
      <li><strong>Oposición:</strong> oponerte al tratamiento para finalidades específicas.</li>
    </ul>
    <p>
      Para ejercer tus derechos ARCO, envía solicitud escrita al responsable con: tu nombre, correo electrónico institucional registrado,
      descripción clara del derecho que deseas ejercer y documentación que acredite tu identidad. El responsable responderá en
      <strong>20 días hábiles</strong>, con posibilidad de prórroga por igual periodo cuando lo justifique la complejidad o el número de solicitudes.
    </p>

    <hr />

    <h2>7. Revocación del Consentimiento</h2>
    <p>Puedes revocar tu consentimiento en cualquier momento mediante solicitud dirigida al responsable. La revocación tiene como consecuencia la baja del usuario del sistema y la cesación del tratamiento de tus datos para las finalidades primarias, salvo que exista obligación legal de conservarlos o defensa de derechos del responsable.</p>
    <p>La revocación del consentimiento <strong>no afecta</strong> los registros operativos anonimizados de los sujetos de estudio, ya que dichos datos no están vinculados a la identidad de ningún usuario.</p>

    <hr />

    <h2>8. Medidas de Seguridad</h2>
    <p>El responsable ha implementado medidas de seguridad administrativas, técnicas y físicas, adecuadas al riesgo del tratamiento:</p>
    <ul>
      <li>Almacenamiento seguro de contraseñas mediante cifrado o hash irreversible.</li>
      <li>Control de acceso basado en roles (RBAC) para cada usuario.</li>
      <li>Registros de auditoría de eventos de seguridad, accesibles únicamente a personal autorizado.</li>
      <li>Uso de identificadores anónimos (UUID) para sujetos de estudio.</li>
      <li>Restricciones técnicas y de diseño para reducir el riesgo de reidentificación.</li>
      <li>Protección de credenciales y configuraciones en entornos de producción mediante controles de acceso restringido.</li>
    </ul>

    <hr />

    <h2>9. Cookies y Tecnologías de Rastreo</h2>
    <p>El Sistema es una plataforma de acceso restringido para investigación académica. <strong>No utiliza</strong> cookies de rastreo, publicidad ni analítica de terceros.</p>
    <p>El almacenamiento local del navegador se usa exclusivamente para mantener la sesión activa durante la navegación y se elimina al cerrar sesión.</p>

    <hr />

    <h2>10. Cambios al Aviso de Privacidad</h2>
    <p>El responsable puede actualizar este aviso para reflejar cambios legislativos, operativos o en las finalidades del tratamiento. Las modificaciones se notificarán por correo electrónico a la cuenta registrada y en el repositorio oficial del proyecto con al menos <strong>15 días de anticipación</strong> a la fecha de entrada en vigor.</p>

    <hr />

    <h2>11. Autoridad de Protección de Datos</h2>
    <p>Si consideras vulnerados tus derechos de protección de datos, puedes interponer queja ante la <strong>Secretaría Anticorrupción y Buen Gobierno (SABG)</strong> y el organismo <strong>"Transparencia para el Pueblo"</strong>:</p>

    <div class="contact-box">
      <h3>Contacto oficial (nivel federal)</h3>
      <p><a href="https://transparencia.gob.mx" target="_blank" rel="noopener noreferrer">https://transparencia.gob.mx</a></p>

      <h3>Autoridad responsable</h3>
      <p>Secretaria de Anticorrupción y Buen Gobierno</p>
      <p><strong>Raquel Buenrostro Sánchez</strong></p>

      <h3>Domicilio</h3>
      <p>Avenida Insurgentes Sur No. 3211, Planta Baja</p>
      <p>Colonia Insurgentes Cuicuilco, Alcaldía Coyoacán, C.P. 04530, Ciudad de México</p>

      <h3>Teléfono general</h3>
      <p>55 5004 2400</p>
    </div>

    <hr />

    <p class="footer">Última actualización: 21 de Abril de 2026</p>
  `,
}
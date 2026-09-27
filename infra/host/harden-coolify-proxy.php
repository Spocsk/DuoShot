<?php
// Run inside the existing Coolify container, working directory /var/www/html.
// The application action saves BOTH its database copy and the remote Compose file.
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$server = App\Models\Server::where('uuid', 'tm1ijjnpf2jnm68prtkezgav')->firstOrFail();
if ($server->ip !== '178.104.185.75') {
    throw new Exception('Wrong target');
}
$current = App\Actions\Proxy\GetProxyConfiguration::run($server);
$config = Symfony\Component\Yaml\Yaml::parse($current);
$config['services']['traefik']['ports'] = array_values(array_filter(
    $config['services']['traefik']['ports'],
    fn ($port) => $port !== '8080:8080'
));
foreach (['5if8qfnj7o1bi2lrd3nbncff', 'i9qtpe5bpyig86s1aljxr5gv'] as $network) {
    $config['networks'][$network] = ['external' => true];
    if (!in_array($network, $config['services']['traefik']['networks'], true)) {
        $config['services']['traefik']['networks'][] = $network;
    }
}
$updated = Symfony\Component\Yaml\Yaml::dump($config, 8, 2);
App\Actions\Proxy\SaveProxyConfiguration::run($server, $updated);
echo "DuoShot proxy ports and persistent service networks saved.\n";

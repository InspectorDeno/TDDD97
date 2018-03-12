from setuptools import setup

setup(
    name='Twidder',
    version='2.0',
    packages=['Twidder'],
    url='',
    license='',
    author='dennisdufback',
    author_email='',
    description='',
    include_package_data=True,
    install_requires=[
        'flask',
        'gevent',
        'gevent-websocket',
    ]
)
